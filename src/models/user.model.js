const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const { ROLES } = require("../constants/roles");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8 },
    role: { type: String, enum: Object.values(ROLES), required: true },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    phone: String,
    employeeId: { type: String, trim: true, uppercase: true, sparse: true },
    matricNumber: { type: String, trim: true, uppercase: true, sparse: true },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    level: { type: Number, min: 100, max: 800 },
    seededStudent: { type: mongoose.Schema.Types.ObjectId, ref: "SeededStudent" },
    seededLecturer: { type: mongoose.Schema.Types.ObjectId, ref: "SeededLecturer" },
    profile: { type: mongoose.Schema.Types.Mixed, default: {} },
    emailVerified: { type: Boolean, default: false },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

userSchema.pre("save", async function preSave(next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(
    this.password,
    parseInt(process.env.BCRYPT_ROUNDS || "12", 10),
  );
  next();
});

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.toJSON = function toJSON() {
  const value = this.toObject();
  delete value.password;
  return value;
};

userSchema.index({ role: 1 });
userSchema.index({ matricNumber: 1 });
userSchema.index({ employeeId: 1 });

module.exports = mongoose.model("User", userSchema);
