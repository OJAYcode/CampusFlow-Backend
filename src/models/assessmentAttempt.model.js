const mongoose = require("mongoose");

const assessmentAttemptSchema = new mongoose.Schema(
  {
    assessment: { type: mongoose.Schema.Types.ObjectId, ref: "Assessment", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startedAt: { type: Date, default: Date.now },
    lastResumedAt: { type: Date, default: Date.now },
    remainingTimeMs: { type: Number, default: 0 },
    submittedAt: Date,
    score: { type: Number, default: 0 },
    status: { type: String, enum: ["in_progress", "submitted", "graded"], default: "in_progress" },
    answers: {
      type: [
        {
          question: { type: mongoose.Schema.Types.ObjectId, ref: "AssessmentQuestion" },
          answer: mongoose.Schema.Types.Mixed,
          isCorrect: Boolean,
          awardedMarks: Number,
        },
      ],
      default: [],
    },
    deviceMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: String,
    proctoring: {
      cameraGranted: { type: Boolean, default: false },
      microphoneGranted: { type: Boolean, default: false },
      tabSwitchCount: { type: Number, default: 0 },
      windowBlurCount: { type: Number, default: 0 },
      penaltyLockUntil: Date,
      penaltyCount: { type: Number, default: 0 },
      totalPenaltyMs: { type: Number, default: 0 },
      lastVisibilityChangeAt: Date,
      latestSnapshotDataUrl: String,
      micLevel: { type: Number, default: 0 },
      updatedAt: Date,
    },
  },
  { timestamps: true },
);

assessmentAttemptSchema.index({ assessment: 1, student: 1 });

module.exports = mongoose.model("AssessmentAttempt", assessmentAttemptSchema);
