const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
  },
  { timestamps: true },
);

departmentSchema.index({ code: 1, faculty: 1 }, { unique: true });

module.exports = mongoose.model("Department", departmentSchema);
