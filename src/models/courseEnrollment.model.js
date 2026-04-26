const mongoose = require("mongoose");

const { ENROLLMENT_TYPES, ENROLLMENT_APPROVAL_STATUS } = require("../constants/enums");

const courseEnrollmentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    enrollmentType: { type: String, enum: Object.values(ENROLLMENT_TYPES), required: true },
    approvalStatus: {
      type: String,
      enum: Object.values(ENROLLMENT_APPROVAL_STATUS),
      default: ENROLLMENT_APPROVAL_STATUS.PENDING,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    rejectionReason: String,
    semester: String,
    academicSession: String,
  },
  { timestamps: true },
);

courseEnrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
courseEnrollmentSchema.index({ student: 1, approvalStatus: 1 });

module.exports = mongoose.model("CourseEnrollment", courseEnrollmentSchema);
