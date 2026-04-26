const mongoose = require("mongoose");

const deviceFingerprintSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    fingerprint: { type: String, required: true, unique: true },
    lastSeenAt: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

module.exports = mongoose.model("DeviceFingerprint", deviceFingerprintSchema);
