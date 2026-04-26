const mongoose = require("mongoose");

const courseMaterialSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: String,
    fileUrl: { type: String, required: true },
    fileName: String,
    fileType: String,
    fileSize: Number,
    visibility: {
      type: String,
      enum: ["enrolled_students", "lecturers_only", "public_course"],
      default: "enrolled_students",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("CourseMaterial", courseMaterialSchema);
