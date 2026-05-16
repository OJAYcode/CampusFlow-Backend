const mongoose = require("mongoose");

const { ASSESSMENT_TYPES, ASSESSMENT_STATUS } = require("../constants/enums");

const assessmentSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    lecturer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    instructions: String,
    assessmentType: { type: String, enum: Object.values(ASSESSMENT_TYPES), required: true },
    totalMarks: { type: Number, default: 100, min: 0 },
    durationMinutes: { type: Number, required: true },
    availableFrom: { type: Date, required: true },
    availableTo: { type: Date, required: true },
    shuffleQuestions: { type: Boolean, default: false },
    allowMultipleAttempts: { type: Boolean, default: false },
    status: { type: String, enum: Object.values(ASSESSMENT_STATUS), default: ASSESSMENT_STATUS.DRAFT },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Assessment", assessmentSchema);
