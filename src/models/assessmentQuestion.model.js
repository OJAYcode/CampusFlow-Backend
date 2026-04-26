const mongoose = require("mongoose");

const assessmentQuestionSchema = new mongoose.Schema(
  {
    assessment: { type: mongoose.Schema.Types.ObjectId, ref: "Assessment", required: true },
    questionText: { type: String, required: true },
    questionType: {
      type: String,
      enum: ["multiple_choice", "short_answer"],
      default: "multiple_choice",
    },
    options: { type: [String], default: [] },
    correctAnswer: mongoose.Schema.Types.Mixed,
    marks: { type: Number, default: 1 },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

assessmentQuestionSchema.index({ assessment: 1, order: 1 });

module.exports = mongoose.model("AssessmentQuestion", assessmentQuestionSchema);
