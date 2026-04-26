const express = require("express");

const authRoutes = require("./auth.routes");
const adminRoutes = require("./admin.routes");
const studentRoutes = require("./student.routes");
const lecturerRoutes = require("./lecturer.routes");
const attendanceRoutes = require("./attendance.routes");
const assessmentRoutes = require("./assessment.routes");
const communicationRoutes = require("./communication.routes");
const materialRoutes = require("./material.routes");
const assignmentRoutes = require("./assignment.routes");
const notificationRoutes = require("./notification.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/students", studentRoutes);
router.use("/lecturers", lecturerRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/materials", materialRoutes);
router.use("/assignments", assignmentRoutes);
router.use("/assessments", assessmentRoutes);
router.use("/communication", communicationRoutes);
router.use("/notifications", notificationRoutes);

module.exports = router;
