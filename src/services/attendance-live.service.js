const { EventEmitter } = require("events");

const CourseEnrollment = require("../models/courseEnrollment.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const AttendancePresence = require("../models/attendancePresence.model");
const AttendanceSession = require("../models/attendanceSession.model");
const ApiError = require("../utils/ApiError");
const { syncAttendanceSessionLifecycle } = require("./attendance-session.service");

const attendanceLiveEmitter = new EventEmitter();
attendanceLiveEmitter.setMaxListeners(200);

const ACTIVE_PRESENCE_WINDOW_MS = 30 * 1000;
const STALE_PRESENCE_WINDOW_MS = 75 * 1000;

async function buildSessionLiveView(sessionId) {
  let session = await AttendanceSession.findById(sessionId).populate(
    "course lecturer",
    "title code semester academicSession fullName",
  );

  if (!session) {
    throw new ApiError(404, "Attendance session not found");
  }

  session = await syncAttendanceSessionLifecycle(session);

  const now = Date.now();
  const cutoff = new Date(now - STALE_PRESENCE_WINDOW_MS);
  const [records, presences, totalEnrolled] = await Promise.all([
    AttendanceRecord.find({ session: session._id })
      .populate("student", "fullName matricNumber email")
      .sort({ createdAt: -1 }),
    AttendancePresence.find({ session: session._id, lastSeenAt: { $gte: cutoff } })
      .populate("student", "fullName matricNumber email")
      .sort({ lastSeenAt: -1 }),
    CourseEnrollment.countDocuments({ course: session.course?._id || session.course, approvalStatus: "approved" }),
  ]);

  const enrichedPresences = presences.map((presence) => {
    const lastSeenMs = new Date(presence.lastSeenAt || presence.joinedAt || presence.createdAt).getTime();
    const freshnessMs = Math.max(now - lastSeenMs, 0);
    return {
      ...presence.toObject(),
      connectionState: freshnessMs <= ACTIVE_PRESENCE_WINDOW_MS ? "live" : "stale",
      freshnessMs,
    };
  });

  const submittedStudentIds = new Set(
    records.map((record) => record.student?._id?.toString?.()).filter(Boolean),
  );
  const joinedStudentIds = new Set(
    enrichedPresences.map((presence) => presence.student?._id?.toString?.()).filter(Boolean),
  );
  const outsideGeofenceCount = enrichedPresences.filter((presence) => !presence.insideGeofence).length;
  const staleCount = enrichedPresences.filter((presence) => presence.connectionState === "stale").length;

  return {
    session,
    records,
    presences: enrichedPresences,
    summary: {
      totalEnrolled,
      joinedCount: joinedStudentIds.size,
      submittedCount: submittedStudentIds.size,
      joinedNotSubmittedCount: Math.max(joinedStudentIds.size - submittedStudentIds.size, 0),
      outsideGeofenceCount,
      staleCount,
    },
  };
}

function notifySessionLiveUpdate(sessionId) {
  attendanceLiveEmitter.emit(`session:${sessionId}`, { sessionId, timestamp: new Date().toISOString() });
}

function subscribeToSessionLiveUpdates(sessionId, listener) {
  const eventName = `session:${sessionId}`;
  attendanceLiveEmitter.on(eventName, listener);
  return () => attendanceLiveEmitter.off(eventName, listener);
}

module.exports = {
  ACTIVE_PRESENCE_WINDOW_MS,
  STALE_PRESENCE_WINDOW_MS,
  buildSessionLiveView,
  notifySessionLiveUpdate,
  subscribeToSessionLiveUpdates,
};
