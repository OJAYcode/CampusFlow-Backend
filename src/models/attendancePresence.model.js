const mongoose = require("mongoose");

const attendancePresenceSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: "AttendanceSession", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    distanceFromSession: Number,
    insideGeofence: { type: Boolean, default: false },
    deviceFingerprint: { type: String, required: true },
    ipAddress: String,
    userAgent: String,
    joinedAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    submittedAttendance: { type: Boolean, default: false },
    submittedAt: Date,
  },
  { timestamps: true },
);

attendancePresenceSchema.index({ session: 1, student: 1 }, { unique: true });
attendancePresenceSchema.index({ session: 1, lastSeenAt: -1 });

module.exports = mongoose.model("AttendancePresence", attendancePresenceSchema);
