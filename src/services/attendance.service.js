const mongoose = require("mongoose");
const AttendanceSession = require("../models/attendanceSession.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const AttendancePresence = require("../models/attendancePresence.model");
const DeviceFingerprint = require("../models/deviceFingerprint.model");
const FaceVerificationLog = require("../models/faceVerificationLog.model");
const ApiError = require("../utils/ApiError");
const { calculateDistanceMeters, generateDeviceFingerprint, generateSessionCode } = require("../utils/geo");
const { ensureStudentEnrolled, ensureLecturerAssigned } = require("./access.service");
const { notifySessionLiveUpdate } = require("./attendance-live.service");

function getGeofenceAllowanceMeters(session, reportedAccuracy) {
  if (session.strictMode) {
    return 0;
  }

  const studentAccuracy = Number.isFinite(reportedAccuracy) ? Math.max(reportedAccuracy, 0) : 0;
  const lecturerAccuracy = Number.isFinite(session.locationAccuracy) ? Math.max(session.locationAccuracy, 0) : 0;
  const combinedAccuracy = studentAccuracy + lecturerAccuracy;

  // Keep a practical GPS tolerance without letting the allowance dwarf the lecturer radius.
  return Math.min(Math.max(combinedAccuracy, 10), 75);
}

async function createSession(lecturerId, payload) {
  await ensureLecturerAssigned(payload.courseId, lecturerId);

  const activeSession = await AttendanceSession.findOne({
    course: payload.courseId,
    lecturer: lecturerId,
    status: "active",
    endTime: { $gte: new Date() },
  });

  if (activeSession) {
    throw new ApiError(409, "There is already an active attendance session for this course");
  }

  return AttendanceSession.create({
    course: payload.courseId,
    lecturer: lecturerId,
    sessionCode: generateSessionCode(),
    startTime: payload.startTime,
    endTime: payload.endTime,
    latitude: payload.latitude,
    longitude: payload.longitude,
    locationAccuracy: payload.locationAccuracy,
    radius: payload.radius,
    roomLabel: payload.roomLabel,
    detectedVenueLabel: payload.detectedVenueLabel,
    venueDetectionSource: payload.venueDetectionSource,
    buildingProfile: payload.buildingProfile,
    strictMode: !!payload.strictMode,
    faceVerificationEnabled: !!payload.faceVerificationEnabled,
  });
}

async function submitAttendance(student, payload, context) {
  const session = await AttendanceSession.findOne({
    _id: payload.sessionId,
    sessionCode: payload.sessionCode,
    status: "active",
    startTime: { $lte: new Date() },
    endTime: { $gte: new Date() },
  }).populate("course");

  if (!session) {
    throw new ApiError(400, "Attendance session is invalid or expired");
  }

  await ensureStudentEnrolled(session.course._id, student._id);

  const deviceFingerprint =
    payload.deviceFingerprint ||
    generateDeviceFingerprint({
      userAgent: context.userAgent,
      ip: context.ip,
      visitorId: payload.visitorId || null,
      deviceName: payload.deviceName || null,
    });

  const distance = calculateDistanceMeters(
    session.latitude,
    session.longitude,
    payload.latitude,
    payload.longitude,
  );
  const geofenceAllowance = getGeofenceAllowanceMeters(session, payload.accuracy);
  const permittedRadius = session.radius + geofenceAllowance;

  if (distance > permittedRadius) {
    throw new ApiError(400, "Student is outside the permitted geofence", {
      distance,
      allowedRadius: session.radius,
      effectiveRadius: permittedRadius,
      geofenceAllowance,
      lecturerAccuracy: session.locationAccuracy || 0,
      studentAccuracy: payload.accuracy || 0,
    });
  }

  const existingStudentRecord = await AttendanceRecord.findOne({
    session: session._id,
    student: student._id,
  });
  if (existingStudentRecord) {
    throw new ApiError(409, "Attendance already submitted for this session");
  }

  const existingDeviceRecord = await AttendanceRecord.findOne({
    session: session._id,
    deviceFingerprint,
    student: { $ne: student._id },
  });
  if (existingDeviceRecord) {
    throw new ApiError(409, "This device has already been used by another student in this session");
  }

  const record = await AttendanceRecord.create({
    session: session._id,
    course: session.course._id,
    student: student._id,
    latitude: payload.latitude,
    longitude: payload.longitude,
    accuracy: payload.accuracy,
    distanceFromSession: distance,
    deviceFingerprint,
    ipAddress: context.ip,
    userAgent: context.userAgent,
    faceImageUrl: payload.faceImageUrl || null,
    faceVerificationStatus: session.faceVerificationEnabled
      ? "pending"
      : "not_required",
  });

  await DeviceFingerprint.findOneAndUpdate(
    { fingerprint: deviceFingerprint },
    {
      fingerprint: deviceFingerprint,
      student: student._id,
      lastSeenAt: new Date(),
      metadata: {
        ip: context.ip,
        userAgent: context.userAgent,
        visitorId: payload.visitorId || null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (payload.faceImageUrl) {
    await FaceVerificationLog.create({
      attendanceRecord: record._id,
      student: student._id,
      imageUrl: payload.faceImageUrl,
      status: session.faceVerificationEnabled ? "pending" : "manual_review",
      provider: "future-integration-hook",
    });
  }

  if (mongoose.isValidObjectId(student._id) && mongoose.isValidObjectId(session._id)) {
    await AttendancePresence.findOneAndUpdate(
      { session: session._id, student: student._id },
      {
        session: session._id,
        course: session.course._id,
        student: student._id,
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy,
        distanceFromSession: distance,
        insideGeofence: distance <= permittedRadius,
        deviceFingerprint,
        ipAddress: context.ip,
        userAgent: context.userAgent,
        lastSeenAt: new Date(),
        submittedAttendance: true,
        submittedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  notifySessionLiveUpdate(session._id.toString());

  return record;
}

async function upsertSessionPresence(student, payload, context) {
  const session = await AttendanceSession.findOne({
    _id: payload.sessionId,
    status: "active",
    startTime: { $lte: new Date() },
    endTime: { $gte: new Date() },
  }).populate("course");

  if (!session) {
    throw new ApiError(400, "Attendance session is invalid or expired");
  }

  await ensureStudentEnrolled(session.course._id, student._id);

  const deviceFingerprint =
    payload.deviceFingerprint ||
    generateDeviceFingerprint({
      userAgent: context.userAgent,
      ip: context.ip,
      visitorId: payload.visitorId || null,
      deviceName: payload.deviceName || null,
    });

  const distance = calculateDistanceMeters(
    session.latitude,
    session.longitude,
    payload.latitude,
    payload.longitude,
  );
  const geofenceAllowance = getGeofenceAllowanceMeters(session, payload.accuracy);
  const permittedRadius = session.radius + geofenceAllowance;

  const presence = await AttendancePresence.findOneAndUpdate(
    { session: session._id, student: student._id },
    {
      session: session._id,
      course: session.course._id,
      student: student._id,
      latitude: payload.latitude,
      longitude: payload.longitude,
      accuracy: payload.accuracy,
      distanceFromSession: distance,
      insideGeofence: distance <= permittedRadius,
      deviceFingerprint,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      lastSeenAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  notifySessionLiveUpdate(session._id.toString());

  return { presence, session };
}

module.exports = { createSession, submitAttendance, upsertSessionPresence };
