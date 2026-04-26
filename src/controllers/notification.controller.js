const Notification = require("../models/notification.model");
const PushSubscription = require("../models/pushSubscription.model");
const apiResponse = require("../utils/apiResponse");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/ApiError");
const { getPublicConfig } = require("../services/pushNotification.service");

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
