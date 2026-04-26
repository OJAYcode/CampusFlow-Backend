const mongoose = require("mongoose");

const facultySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, required: true, uppercase: true, unique: true, trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Faculty", facultySchema);
