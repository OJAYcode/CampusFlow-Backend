const mongoose = require("mongoose");

const attendanceSessionSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    lecturer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sessionCode: { type: String, required: true, index: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    locationAccuracy: Number,
    radius: { type: Number, required: true, default: 100 },
    roomLabel: String,
    detectedVenueLabel: String,
    venueDetectionSource: String,
    buildingProfile: String,
    status: { type: String, enum: ["active", "inactive", "expired", "cancelled"], default: "active" },
    strictMode: { type: Boolean, default: false },
    faceVerificationEnabled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

attendanceSessionSchema.index({ course: 1, status: 1, endTime: 1 });

module.exports = mongoose.model("AttendanceSession", attendanceSessionSchema);
