const express = require("express");

const lecturerController = require("../../controllers/lecturer.controller");
const validate = require("../../middlewares/validate.middleware");
const { protect, authorize } = require("../../middlewares/auth.middleware");
const { ROLES } = require("../../constants/roles");
const { createUploader } = require("../../middlewares/upload.middleware");
const {
  attendanceSessionValidator,
  materialValidator,
  assignmentValidator,
  assignmentUpdateValidator,
  assessmentValidator,
  assessmentUpdateValidator,
  announcementValidator,
  announcementUpdateValidator,
  messageValidator,
  gradingValidator,
} = require("../../validators/lecturer.validator");

const router = express.Router();
const uploadMaterials = createUploader("materials", 3);
const uploadAssignments = createUploader("assignments", 5);

router.use(protect, authorize(ROLES.LECTURER));

router.get("/courses", lecturerController.getCourses);
router.get("/courses/:courseId/workspace", lecturerController.getCourseWorkspace);
router.get("/courses/:courseId/students", lecturerController.listCourseStudents);
router.get("/courses/:courseId/report", lecturerController.courseReport);
router.get("/courses/:courseId/attendance-percentages", lecturerController.courseAttendancePercentages);
router.get("/courses/:courseId/report.csv", lecturerController.exportCourseReportCsv);
router.get("/courses/:courseId/report.pdf", lecturerController.exportCourseReportPdf);
router.get("/attendance-sessions", lecturerController.listAttendanceSessions);
router.patch("/attendance-sessions/:sessionId/end", lecturerController.endAttendanceSession);
router.patch("/attendance-sessions/:sessionId/cancel", lecturerController.cancelAttendanceSession);
router.get("/attendance-sessions/:sessionId/live", lecturerController.getAttendanceSessionLive);
router.get("/attendance-sessions/:sessionId/live/stream", lecturerController.streamAttendanceSessionLive);
router.get("/attendance-sessions/:sessionId/export.csv", lecturerController.exportAttendanceSessionCsv);
router.get("/attendance-sessions/:sessionId/export.docx", lecturerController.exportAttendanceSessionDocx);
router.get("/attendance-sessions/:sessionId/export.pdf", lecturerController.exportAttendanceSessionPdf);
router.post("/attendance-sessions", attendanceSessionValidator, validate, lecturerController.createAttendanceSession);
router.post(
  "/materials",
  uploadMaterials.array("files", 3),
  materialValidator,
  validate,
  lecturerController.uploadMaterial,
);
router.delete("/materials/:materialId", lecturerController.deleteMaterial);
router.post(
  "/assignments",
  uploadAssignments.array("files", 5),
  assignmentValidator,
  validate,
  lecturerController.createAssignment,
);
router.patch("/assignments/:assignmentId", assignmentUpdateValidator, validate, lecturerController.updateAssignment);
router.delete("/assignments/:assignmentId", lecturerController.deleteAssignment);
router.get("/assignments/:assignmentId/submissions", lecturerController.getAssignmentSubmissions);
router.patch("/submissions/:submissionId/grade", gradingValidator, validate, lecturerController.gradeSubmission);
router.post("/assessments", assessmentValidator, validate, lecturerController.createAssessment);
router.get("/assessments", lecturerController.listAssessments);
router.patch("/assessments/:assessmentId", assessmentUpdateValidator, validate, lecturerController.updateAssessment);
router.delete("/assessments/:assessmentId", lecturerController.deleteAssessment);
router.get("/assessments/:assessmentId/attempts", lecturerController.listAssessmentAttempts);
router.post("/announcements", announcementValidator, validate, lecturerController.publishAnnouncement);
router.get("/announcements", lecturerController.listAnnouncements);
router.patch("/announcements/:announcementId", announcementUpdateValidator, validate, lecturerController.updateAnnouncement);
router.delete("/announcements/:announcementId", lecturerController.deleteAnnouncement);
router.post("/messages", messageValidator, validate, lecturerController.sendMessage);
router.get("/messages", lecturerController.listMessages);

module.exports = router;
