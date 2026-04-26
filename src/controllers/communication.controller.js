const Announcement = require("../models/announcement.model");
const Course = require("../models/course.model");
const Message = require("../models/message.model");
const apiResponse = require("../utils/apiResponse");
const catchAsync = require("../utils/catchAsync");
const { getPagination } = require("../utils/pagination");

function getCourseIdFromThreadKey(threadKey) {
  const parts = String(threadKey || "").split("-");
  if (parts[0] !== "course") return null;
  return parts[1] === "broadcast" ? parts[2] : parts[1];
}

async function resolveThreadCourse(message, cache) {
  if (message.course) return message.course;

  const courseId = getCourseIdFromThreadKey(message.threadKey);
  if (!courseId) return null;

  if (!cache.has(courseId)) {
    cache.set(courseId, Course.findById(courseId).select("title code").lean().exec());
  }

  return cache.get(courseId);
}

exports.listAnnouncements = catchAsync(async (req, res) => {
  const announcements = await Announcement.find().populate("course sender", "title code fullName");
  return apiResponse(res, { message: "Announcements fetched", data: announcements });
});

exports.listMessages = catchAsync(async (req, res) => {
  const messages = await Message.find({
    $or: [{ sender: req.user._id }, { recipients: req.user._id }],
  })
    .populate("course", "title code")
    .populate("sender", "fullName email role")
    .populate("recipients", "fullName email role")
    .sort({ createdAt: -1 });

  const threadMap = new Map();
  const courseCache = new Map();
  for (const message of messages) {
    const key = message.threadKey;
    const course = await resolveThreadCourse(message, courseCache);
    if (!threadMap.has(key)) {
      const readBy = Array.isArray(message.readBy) ? message.readBy : [];
      const hasRead = readBy.some(
        (entry) => entry?.user?.toString?.() === req.user._id.toString(),
      );

      threadMap.set(key, {
        threadKey: key,
        course,
        latestMessage: message,
        latestMessageAt: message.createdAt,
        participants: [message.sender, ...(message.recipients || [])].filter(Boolean),
        unreadCount:
          message.sender?.toString?.() === req.user._id.toString() || hasRead ? 0 : 1,
      });
      continue;
    }

    const summary = threadMap.get(key);
    const readBy = Array.isArray(message.readBy) ? message.readBy : [];
    const hasRead = readBy.some(
      (entry) => entry?.user?.toString?.() === req.user._id.toString(),
    );

    if (
      message.sender?.toString?.() !== req.user._id.toString() &&
      !hasRead
    ) {
      summary.unreadCount += 1;
    }
  }

  const { page, limit, skip } = getPagination(req.query);
  const threadItems = Array.from(threadMap.values());
  const pagedThreads = threadItems.slice(skip, skip + limit);

  return apiResponse(res, {
    message: "Message threads fetched",
    data: {
      items: pagedThreads,
      total: threadItems.length,
      page,
      limit,
      totalPages: Math.max(Math.ceil(threadItems.length / limit), 1),
    },
  });
});

exports.getThreadMessages = catchAsync(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const messages = await Message.find({
    threadKey: req.params.threadKey,
    $or: [{ sender: req.user._id }, { recipients: req.user._id }],
  })
    .populate("course", "title code")
    .populate("sender", "fullName email role")
    .populate("recipients", "fullName email role")
    .sort({ createdAt: 1 });

  if (!messages.length) {
    return apiResponse(res, {
      message: "Thread messages fetched",
      data: { items: [], total: 0, page, limit, totalPages: 1 },
    });
  }

  const courseCache = new Map();
  const hydratedMessages = await Promise.all(
    messages.map(async (message) => {
      if (message.course) return message;
      const course = await resolveThreadCourse(message, courseCache);
      return { ...message.toObject(), course };
    }),
  );

  return apiResponse(res, {
    message: "Thread messages fetched",
    data: {
      items: hydratedMessages.slice(skip, skip + limit),
      total: hydratedMessages.length,
      page,
      limit,
      totalPages: Math.max(Math.ceil(hydratedMessages.length / limit), 1),
    },
  });
});

exports.markThreadAsRead = catchAsync(async (req, res) => {
  const messages = await Message.find({
    threadKey: req.params.threadKey,
    recipients: req.user._id,
  }).sort({ createdAt: 1 });

  if (!messages.length) {
    return apiResponse(res, {
      message: "Thread marked as read",
      data: { threadKey: req.params.threadKey, updatedCount: 0 },
    });
  }

  let updatedCount = 0;
  for (const message of messages) {
    const readBy = Array.isArray(message.readBy) ? message.readBy : [];
    const alreadyRead = readBy.some(
      (entry) => entry?.user?.toString?.() === req.user._id.toString(),
    );
    if (!alreadyRead) {
      message.readBy.push({
        user: req.user._id,
        readAt: new Date(),
      });
      await message.save();
      updatedCount += 1;
    }
  }

  return apiResponse(res, {
    message: "Thread marked as read",
    data: { threadKey: req.params.threadKey, updatedCount },
  });
});
