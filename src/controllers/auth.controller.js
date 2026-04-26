const apiResponse = require("../utils/apiResponse");
const catchAsync = require("../utils/catchAsync");
const {
  registerStudent,
  registerLecturer,
  loginWithRole,
  refreshAccessToken,
  requestPasswordReset,
  resetPassword,
} = require("../services/auth.service");
const { ROLES } = require("../constants/roles");

exports.registerStudent = catchAsync(async (req, res) => {
  const result = await registerStudent(req.body);
  await req.audit("student_registered", { resource: "auth" });

  return apiResponse(res, {
    statusCode: 201,
    message: "Student account created successfully",
    data: result,
  });
});

exports.registerLecturer = catchAsync(async (req, res) => {
  const result = await registerLecturer(req.body);
  await req.audit("lecturer_registered", { resource: "auth" });

  return apiResponse(res, {
    statusCode: 201,
    message: "Lecturer account created successfully",
    data: result,
  });
});

exports.loginStudent = catchAsync(async (req, res) => {
  const result = await loginWithRole({ ...req.body, role: ROLES.STUDENT });
  return apiResponse(res, { message: "Student login successful", data: result });
});

exports.loginLecturer = catchAsync(async (req, res) => {
  const result = await loginWithRole({ ...req.body, role: ROLES.LECTURER });
  return apiResponse(res, { message: "Lecturer login successful", data: result });
});

exports.loginAdmin = catchAsync(async (req, res) => {
  const result = await loginWithRole({
    ...req.body,
    roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  });
  return apiResponse(res, { message: "Admin login successful", data: result });
});

exports.refreshToken = catchAsync(async (req, res) => {
  const result = await refreshAccessToken(req.body.refreshToken);
  return apiResponse(res, { message: "Access token refreshed", data: result });
});

exports.forgotPassword = catchAsync(async (req, res) => {
  const result = await requestPasswordReset(req.body.email);
  return apiResponse(res, { message: result.message, data: result });
});

exports.resetPassword = catchAsync(async (req, res) => {
  const result = await resetPassword(req.body.resetToken, req.body.newPassword);
  return apiResponse(res, { message: "Password reset successful", data: result });
});

exports.me = catchAsync(async (req, res) => {
  return apiResponse(res, { message: "Authenticated user fetched", data: req.user });
});
