const mongoose = require("mongoose");

const approvedStaffSchema = new mongoose.Schema(
  {
    staff_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: null,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    department: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

approvedStaffSchema.pre("validate", function (next) {
  if (this.staff_id) {
    this.staff_id = this.staff_id.toString().trim().toUpperCase();
  }
  next();
});

module.exports = mongoose.model("ApprovedStaff", approvedStaffSchema);
