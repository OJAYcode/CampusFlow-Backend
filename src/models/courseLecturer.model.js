const mongoose = require("mongoose");

const courseLecturerSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    lecturer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    permissions: {
      type: [String],
      default: [
        "manage_attendance",
        "manage_materials",
        "manage_assignments",
        "manage_assessments",
        "manage_communication",
      ],
    },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

courseLecturerSchema.index({ course: 1, lecturer: 1 }, { unique: true });

module.exports = mongoose.model("CourseLecturer", courseLecturerSchema);
