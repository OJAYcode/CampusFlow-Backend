const express = require("express");

const attendanceController = require("../../controllers/attendance.controller");
const validate = require("../../middlewares/validate.middleware");
const { protect, authorize } = require("../../middlewares/auth.middleware");
const { ROLES } = require("../../constants/roles");
const { attendancePresenceValidator, attendanceSubmitValidator } = require("../../validators/attendance.validator");

const router = express.Router();

router.get("/sessions", protect, attendanceController.getActiveSessions);
router.post(
  "/presence/join",
  protect,
  authorize(ROLES.STUDENT),
  attendancePresenceValidator,
  validate,
  attendanceController.joinSessionPresence,
);
router.post("/submit", protect, authorize(ROLES.STUDENT), attendanceSubmitValidator, validate, attendanceController.submitAttendance);
router.get("/history", protect, authorize(ROLES.STUDENT), attendanceController.getAttendanceHistory);
router.get("/presence", protect, authorize(ROLES.STUDENT), attendanceController.getMySessionPresence);

module.exports = router;
