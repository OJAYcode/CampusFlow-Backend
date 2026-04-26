const mongoose = require("mongoose");

const seededLecturerSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    phone: String,
    academicStatus: { type: String, default: "active" },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    isActivated: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SeededLecturer", seededLecturerSchema);
