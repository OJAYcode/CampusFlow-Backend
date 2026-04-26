const mongoose = require("mongoose");

const { COURSE_TYPES } = require("../constants/enums");

const courseSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true, unique: true },
    title: { type: String, required: true, trim: true },
    description: String,
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    level: { type: Number, required: true },
    semester: { type: String, enum: ["first", "second"], required: true },
    academicSession: { type: String, required: true },
    courseType: { type: String, enum: Object.values(COURSE_TYPES), required: true },
    creditUnit: { type: Number, default: 2 },
    status: { type: String, enum: ["draft", "active", "archived"], default: "active" },
  },
  { timestamps: true },
);

courseSchema.index({ department: 1, level: 1, semester: 1, courseType: 1 });

module.exports = mongoose.model("Course", courseSchema);
