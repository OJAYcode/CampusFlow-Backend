const { body } = require("express-validator");

const studentRegisterValidator = [
  body("matricNumber").trim().notEmpty(),
  body("email").isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body("password").isLength({ min: 8 }),
  body("phone").optional().isString(),
];

const lecturerRegisterValidator = [
  body("employeeId").trim().notEmpty(),
  body("email").isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body("password").isLength({ min: 8 }),
  body("phone").optional().isString(),
];

const loginValidator = [
  body("email").isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body("password").notEmpty(),
];

const refreshTokenValidator = [body("refreshToken").notEmpty()];

const forgotPasswordValidator = [
  body("email").isEmail().normalizeEmail({ gmail_remove_dots: false }),
];

const resetPasswordValidator = [
  body("resetToken").notEmpty(),
  body("newPassword").isLength({ min: 8 }),
];

module.exports = {
  studentRegisterValidator,
  lecturerRegisterValidator,
  loginValidator,
  refreshTokenValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
};
