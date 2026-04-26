const mongoose = require("mongoose");

const { ASSIGNMENT_STATUS } = require("../constants/enums");

const assignmentSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    lecturer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: String,
    instructions: String,
    dueDate: { type: Date, required: true },
    totalMarks: { type: Number, default: 100 },
    attachmentUrls: { type: [String], default: [] },
    allowedSubmissionTypes: { type: [String], default: ["text", "file"] },
    status: { type: String, enum: Object.values(ASSIGNMENT_STATUS), default: ASSIGNMENT_STATUS.DRAFT },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Assignment", assignmentSchema);
