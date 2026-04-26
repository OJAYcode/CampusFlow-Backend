const mongoose = require("mongoose");

const faceVerificationLogSchema = new mongoose.Schema(
  {
    attendanceRecord: { type: mongoose.Schema.Types.ObjectId, ref: "AttendanceRecord" },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    imageUrl: String,
    matchScore: Number,
    status: {
      type: String,
      enum: ["pending", "passed", "failed", "manual_review"],
      default: "pending",
    },
    provider: String,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

module.exports = mongoose.model("FaceVerificationLog", faceVerificationLogSchema);
