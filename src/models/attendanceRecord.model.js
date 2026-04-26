const mongoose = require("mongoose");

const { ATTENDANCE_STATUS } = require("../constants/enums");

const attendanceRecordSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: "AttendanceSession", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    submittedAt: { type: Date, default: Date.now },
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    distanceFromSession: Number,
    deviceFingerprint: { type: String, required: true },
    ipAddress: String,
    userAgent: String,
    status: { type: String, enum: Object.values(ATTENDANCE_STATUS), default: ATTENDANCE_STATUS.PRESENT },
    reason: String,
    securityLayers: {
      sessionCodeValidated: { type: Boolean, default: true },
      locationValidated: { type: Boolean, default: true },
      deviceValidated: { type: Boolean, default: true },
      accountValidated: { type: Boolean, default: true },
    },
    faceImageUrl: String,
    faceMatchScore: Number,
    faceVerificationStatus: {
      type: String,
      enum: ["not_required", "pending", "passed", "failed"],
      default: "not_required",
    },
  },
  { timestamps: true },
);

attendanceRecordSchema.index({ session: 1, student: 1 }, { unique: true });
attendanceRecordSchema.index({ session: 1, deviceFingerprint: 1 }, { unique: true });

module.exports = mongoose.model("AttendanceRecord", attendanceRecordSchema);
