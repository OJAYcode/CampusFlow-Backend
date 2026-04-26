const AttendanceSession = require("../models/attendanceSession.model");

async function expireOverdueAttendanceSessions(scope = {}) {
  const now = new Date();

  await AttendanceSession.updateMany(
    {
      ...scope,
      status: "active",
      endTime: { $lt: now },
    },
    {
      $set: { status: "expired" },
    },
  );
}

async function syncAttendanceSessionLifecycle(session) {
  if (!session) {
    return session;
  }

  if (session.status === "active" && session.endTime && new Date(session.endTime) < new Date()) {
    session.status = "expired";
    await session.save();
  }

  return session;
}

module.exports = {
  expireOverdueAttendanceSessions,
  syncAttendanceSessionLifecycle,
};
