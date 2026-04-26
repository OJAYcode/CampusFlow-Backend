const express = require("express");

const authController = require("../../controllers/auth.controller");
const validate = require("../../middlewares/validate.middleware");
const { protect } = require("../../middlewares/auth.middleware");
const {
  studentRegisterValidator,
  lecturerRegisterValidator,
  loginValidator,
  refreshTokenValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} = require("../../validators/auth.validator");

const router = express.Router();

router.post("/student/register", studentRegisterValidator, validate, authController.registerStudent);
router.post("/lecturer/register", lecturerRegisterValidator, validate, authController.registerLecturer);
router.post("/student/login", loginValidator, validate, authController.loginStudent);
router.post("/lecturer/login", loginValidator, validate, authController.loginLecturer);
router.post("/admin/login", loginValidator, validate, authController.loginAdmin);
router.post("/refresh-token", refreshTokenValidator, validate, authController.refreshToken);
router.post("/forgot-password", forgotPasswordValidator, validate, authController.forgotPassword);
router.post("/reset-password", resetPasswordValidator, validate, authController.resetPassword);
router.get("/me", protect, authController.me);

module.exports = router;
