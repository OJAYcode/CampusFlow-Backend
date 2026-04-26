const AttendanceRecord = require("../models/attendanceRecord.model");
const AttendanceSession = require("../models/attendanceSession.model");
const AttendancePresence = require("../models/attendancePresence.model");
const CourseEnrollment = require("../models/courseEnrollment.model");
const apiResponse = require("../utils/apiResponse");
const catchAsync = require("../utils/catchAsync");
const { submitAttendance, upsertSessionPresence } = require("../services/attendance.service");
const { expireOverdueAttendanceSessions } = require("../services/attendance-session.service");

exports.submitAttendance = catchAsync(async (req, res) => {
  const record = await submitAttendance(req.user, req.body, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  await req.audit("attendance_submitted", {
    resource: "attendance_records",
    sessionId: req.body.sessionId,
  });

  return apiResponse(res, {
    statusCode: 201,
    message: "Attendance submitted successfully",
    data: record,
  });
});

exports.getAttendanceHistory = catchAsync(async (req, res) => {
  const history = await AttendanceRecord.find({ student: req.user._id })
    .populate("course session")
    .sort({ createdAt: -1 });

  return apiResponse(res, { message: "Attendance history fetched", data: history });
});

exports.joinSessionPresence = catchAsync(async (req, res) => {
  const result = await upsertSessionPresence(req.user, req.body, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  return apiResponse(res, {
    statusCode: 201,
    message: "Attendance session presence updated",
    data: result,
  });
});

exports.getActiveSessions = catchAsync(async (req, res) => {
  await expireOverdueAttendanceSessions();

  const now = new Date();
  const sessionStartGraceWindow = new Date(now.getTime() + 5 * 60 * 1000);
  const query = {
    status: "active",
    startTime: { $lte: sessionStartGraceWindow },
    endTime: { $gte: now },
  };

  let sessions = await AttendanceSession.find(query)
    .populate("course lecturer", "title code fullName")
    .sort({ startTime: 1, createdAt: -1 });

  if (req.user?.role === "student") {
    const enrollments = await CourseEnrollment.find({
      student: req.user._id,
      approvalStatus: "approved",
    }).select("course");

    const enrolledCourseIds = new Set(
      enrollments
        .map((item) => (item.course ? String(item.course) : null))
        .filter(Boolean),
    );

    sessions = sessions.filter((session) => {
      const courseId = session.course?._id ? String(session.course._id) : session.course ? String(session.course) : null;
      return courseId && enrolledCourseIds.has(courseId);
    });
  }

  return apiResponse(res, { message: "Active attendance sessions fetched", data: sessions });
});

exports.getMySessionPresence = catchAsync(async (req, res) => {
  const presence = await AttendancePresence.find({ student: req.user._id })
    .populate("course session")
    .sort({ lastSeenAt: -1 })
    .limit(50);

  return apiResponse(res, { message: "Attendance presence fetched", data: presence });
});
