const Notification = require("../models/notification.model");
const PushSubscription = require("../models/pushSubscription.model");
const User = require("../models/user.model");
const apiResponse = require("../utils/apiResponse");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/ApiError");
const { getPublicConfig } = require("../services/pushNotification.service");
const jwt = require("jsonwebtoken");
const { notifyForUsers } = require("../services/announcement-stream.service");

exports.getPushPublicConfig = catchAsync(async (_req, res) => {
  return apiResponse(res, {
    message: "Push notification config fetched",
    data: getPublicConfig(),
  });
});

exports.upsertPushSubscription = catchAsync(async (req, res) => {
  const { endpoint, keys, portal } = req.body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new ApiError(400, "A valid push subscription is required");
  }

  if (!["student", "staff"].includes(portal)) {
    throw new ApiError(400, "Portal must be student or staff");
  }

  const subscription = await PushSubscription.findOneAndUpdate(
    { user: req.user._id, endpoint },
    {
      user: req.user._id,
      endpoint,
      keys: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      portal,
      userAgent: req.get("User-Agent"),
      lastUsedAt: new Date(),
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  );

  return apiResponse(res, { statusCode: 201, message: "Push subscription saved", data: subscription });
});

exports.deletePushSubscription = catchAsync(async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    throw new ApiError(400, "Subscription endpoint is required");
  }

  await PushSubscription.deleteOne({ user: req.user._id, endpoint });
  return apiResponse(res, { message: "Push subscription removed", data: { endpoint } });
});

exports.listNotifications = catchAsync(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  return apiResponse(res, { message: "Notifications fetched", data: notifications });
});

exports.streamNotifications = catchAsync(async (req, res) => {
  // authenticate via token query param or Authorization header (EventSource can't set headers)
  const token = String(req.query?.token || "").trim() || (req.headers.authorization || "").startsWith("Bearer ") ? (req.headers.authorization || "").replace("Bearer ", "") : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication token is required for SSE" });
  }

  let user;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    user = await User.findById(decoded.sub);
  } catch (e) {
    return res.status(401).json({ success: false, message: "Invalid or expired authentication token" });
  }

  if (!user || user.status !== "active") {
    return res.status(401).json({ success: false, message: "User account is unavailable" });
  }

  // keep-alive SSE stream for per-user notifications
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  // send a ready event
  res.write(`event: ready\ndata: ${JSON.stringify({ message: "connected" })}\n\n`);

  const { subscribe } = require("../services/announcement-stream.service");
  const unsubscribe = subscribe(user._id, res);

  // heartbeat
  const hb = setInterval(() => {
    try {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ ts: new Date().toISOString() })}\n\n`);
    } catch (e) {}
  }, 25000);

  req.on("close", () => {
    clearInterval(hb);
    unsubscribe();
    res.end();
  });
});

exports.issueSseCookie = catchAsync(async (req, res) => {
  // issue a short-lived cookie containing a JWT for SSE auth
  const token = jwt.sign({ sub: req.user._id }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const cookieOptions = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000,
  };
  res.cookie('cf_sse', token, cookieOptions);
  return apiResponse(res, { message: 'SSE cookie issued' });
});

exports.listSseClients = catchAsync(async (_req, res) => {
  try {
    const { clientsByUser } = require('../services/announcement-stream.service');
    const result = {};
    for (const [userId, clients] of clientsByUser.entries()) {
      result[userId] = (clients || []).length;
    }
    return apiResponse(res, { message: 'SSE clients', data: result });
  } catch (e) {
    return apiResponse(res, { message: 'SSE clients', data: {} });
  }
});
