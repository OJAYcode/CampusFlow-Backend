const mongoose = require("mongoose");

const seededStudentSchema = new mongoose.Schema(
  {
    matricNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    fullName: { type: String, required: true, trim: true },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    level: { type: Number, required: true },
    email: String,
    phone: String,
    academicStatus: { type: String, default: "active" },
    admissionSession: String,
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    isActivated: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SeededStudent", seededStudentSchema);
