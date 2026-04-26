const User = require("../models/user.model");
const SeededStudent = require("../models/seededStudent.model");
const SeededLecturer = require("../models/seededLecturer.model");
const ApiError = require("../utils/ApiError");
const jwt = require("jsonwebtoken");
const { signAccessToken, signRefreshToken, signPasswordResetToken } = require("../utils/jwt");
const { ROLES } = require("../constants/roles");
const { autoEnrollCoreCourses } = require("./enrollment.service");
const emailService = require("./emailServiceInstance");

async function registerStudent(payload) {
  const seededStudent = await SeededStudent.findOne({
    matricNumber: payload.matricNumber.toUpperCase(),
  });

  if (!seededStudent) {
    throw new ApiError(400, "Student record was not found in seeded records");
  }

  if (seededStudent.isActivated) {
    throw new ApiError(409, "Student account already exists for this matric number");
  }

  const existingUser = await User.findOne({ email: payload.email.toLowerCase() });
  if (existingUser) {
    throw new ApiError(409, "Email address is already in use");
  }

  const student = await User.create({
    fullName: seededStudent.fullName,
    email: payload.email.toLowerCase(),
    password: payload.password,
    role: ROLES.STUDENT,
    phone: payload.phone || seededStudent.phone,
    matricNumber: seededStudent.matricNumber,
    faculty: seededStudent.faculty,
    department: seededStudent.department,
    level: seededStudent.level,
    seededStudent: seededStudent._id,
    emailVerified: false,
  });

  seededStudent.isActivated = true;
  await seededStudent.save();

  await autoEnrollCoreCourses(student);

  return {
    user: student,
    token: signAccessToken(student),
    refreshToken: signRefreshToken(student),
  };
}

async function registerLecturer(payload) {
  const normalizedEmployeeId = payload.employeeId.toUpperCase();
  const normalizedEmail = payload.email.toLowerCase();
  const seededLecturer = await SeededLecturer.findOne({
    employeeId: normalizedEmployeeId,
  });

  if (!seededLecturer) {
    throw new ApiError(400, "Invalid staff ID");
  }

  if (seededLecturer.isActivated) {
    throw new ApiError(409, "Staff ID already linked to an account");
  }

  if (seededLecturer.email && seededLecturer.email.toLowerCase() !== normalizedEmail) {
    throw new ApiError(400, "Staff ID/email mismatch");
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(409, "Email address is already in use");
  }

  const lecturer = await User.create({
    fullName: seededLecturer.fullName,
    email: normalizedEmail,
    password: payload.password,
    role: ROLES.LECTURER,
    phone: payload.phone || seededLecturer.phone,
    employeeId: seededLecturer.employeeId,
    faculty: seededLecturer.faculty,
    department: seededLecturer.department,
    seededLecturer: seededLecturer._id,
    emailVerified: false,
  });

  seededLecturer.isActivated = true;
  await seededLecturer.save();

  return {
    user: lecturer,
    token: signAccessToken(lecturer),
    refreshToken: signRefreshToken(lecturer),
  };
}

async function loginWithRole({ email, role, roles, password }) {
  const query = {
    email: email.toLowerCase(),
  };

  if (Array.isArray(roles) && roles.length) {
    query.role = { $in: roles };
  } else {
    query.role = role;
  }

  const user = await User.findOne(query);
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  user.lastLoginAt = new Date();
  await user.save();

  return {
    user,
    token: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    throw new ApiError(400, "Refresh token is required");
  }

  const decoded = jwt.verify(
    refreshToken,
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
  );

  if (decoded.type !== "refresh") {
    throw new ApiError(400, "Invalid refresh token type");
  }

  const user = await User.findById(decoded.sub);
  if (!user || user.status !== "active") {
    throw new ApiError(401, "User account is unavailable");
  }

  return {
    user,
    token: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

async function requestPasswordReset(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return {
      resetToken: null,
      message: "If the account exists, a password reset token has been generated.",
    };
  }

  const resetToken = signPasswordResetToken(user);
  const resetLinkBase =
    process.env.FRONTEND_RESET_PASSWORD_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:3000/reset-password";
  const separator = resetLinkBase.includes("?") ? "&" : "?";
  const resetLink = `${resetLinkBase}${separator}token=${encodeURIComponent(resetToken)}`;

  const emailResult = await emailService.sendPasswordResetLink(
    user.email,
    user.fullName,
    resetLink,
  );

  return {
    resetToken: process.env.NODE_ENV === "development" ? resetToken : undefined,
    resetLink: process.env.NODE_ENV === "development" ? resetLink : undefined,
    emailStatus: emailResult?.skipped ? "skipped" : "sent",
    message: emailResult?.skipped
      ? "Password reset token generated, but email delivery was skipped."
      : "Password reset instructions sent.",
  };
}

async function resetPassword(resetToken, newPassword) {
  if (!resetToken) {
    throw new ApiError(400, "Reset token is required");
  }

  const decoded = jwt.verify(
    resetToken,
    process.env.JWT_RESET_SECRET || process.env.JWT_SECRET,
  );

  if (decoded.type !== "password_reset") {
    throw new ApiError(400, "Invalid reset token type");
  }

  const user = await User.findById(decoded.sub);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.password = newPassword;
  await user.save();

  return {
    user,
    token: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

module.exports = {
  registerStudent,
  registerLecturer,
  loginWithRole,
  refreshAccessToken,
  requestPasswordReset,
  resetPassword,
};
