const mongoose = require("mongoose");

const { SUBMISSION_STATUS } = require("../constants/enums");

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    submittedAt: { type: Date, default: Date.now },
    submissionText: String,
    attachmentUrls: { type: [String], default: [] },
    status: { type: String, enum: Object.values(SUBMISSION_STATUS), default: SUBMISSION_STATUS.SUBMITTED },
    grade: Number,
    feedback: String,
  },
  { timestamps: true },
);

assignmentSubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("AssignmentSubmission", assignmentSubmissionSchema);
