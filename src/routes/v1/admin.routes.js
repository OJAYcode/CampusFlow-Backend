const express = require("express");

const adminController = require("../../controllers/admin.controller");
const validate = require("../../middlewares/validate.middleware");
const { protect, authorize } = require("../../middlewares/auth.middleware");
const { ROLES } = require("../../constants/roles");
const {
  facultyValidator,
  departmentValidator,
  seedStudentsValidator,
  seedLecturersValidator,
  userCreateValidator,
  courseValidator,
  courseLecturerValidator,
  approvalValidator,
  idParamValidator,
} = require("../../validators/admin.validator");

const router = express.Router();

router.use(protect, authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN));

router.get("/dashboard", adminController.getAdminDashboard);
router.get("/faculties", adminController.listFaculties);
router.get("/seeded-students", adminController.listSeededStudents);
router.get("/seeded-lecturers", adminController.listSeededLecturers);
router.get("/students", adminController.listStudents);
router.get("/lecturers", adminController.listLecturers);
router.get("/courses", adminController.listCourses);
router.get("/departments", adminController.listDepartments);
router.get("/materials", adminController.listMaterials);
router.get("/assignments", adminController.listAssignments);
router.get("/assessment-attempts", adminController.listAssessmentAttempts);
router.get("/attendance-sessions", adminController.listAttendanceSessions);
router.get("/attendance-sessions/:id/live", idParamValidator, validate, adminController.getAttendanceSessionLive);
router.get("/attendance-sessions/:id/live/stream", idParamValidator, validate, adminController.streamAttendanceSessionLive);
router.get("/attendance-records", adminController.listAttendanceRecords);
router.get("/attendance-sessions/:id/export.csv", idParamValidator, validate, adminController.exportAttendanceSessionCsv);
router.get("/attendance-sessions/:id/export.docx", idParamValidator, validate, adminController.exportAttendanceSessionDocx);
router.get("/attendance-sessions/:id/export.pdf", idParamValidator, validate, adminController.exportAttendanceSessionPdf);
router.get("/communications", adminController.listCommunications);
router.get("/audit-logs", adminController.listAuditLogs);
router.get("/reports/system", adminController.systemReports);
router.post("/faculties", facultyValidator, validate, adminController.createFaculty);
router.patch("/faculties/:id", idParamValidator, validate, adminController.updateFaculty);
router.delete("/faculties/:id", idParamValidator, validate, adminController.deleteFaculty);
router.post("/departments", departmentValidator, validate, adminController.createDepartment);
router.patch("/departments/:id", idParamValidator, validate, adminController.updateDepartment);
router.delete("/departments/:id", idParamValidator, validate, adminController.deleteDepartment);
router.post("/students/seed", seedStudentsValidator, validate, adminController.seedStudents);
router.patch("/seeded-students/:id", idParamValidator, validate, adminController.updateSeededStudent);
router.delete("/seeded-students/:id", idParamValidator, validate, adminController.deleteSeededStudent);
router.post("/lecturers/seed", seedLecturersValidator, validate, adminController.seedLecturers);
router.patch("/seeded-lecturers/:id", idParamValidator, validate, adminController.updateSeededLecturer);
router.delete("/seeded-lecturers/:id", idParamValidator, validate, adminController.deleteSeededLecturer);
router.post("/lecturers", userCreateValidator, validate, adminController.createLecturer);
router.patch("/lecturers/:id", idParamValidator, validate, adminController.updateLecturer);
router.delete("/lecturers/:id", idParamValidator, validate, adminController.deleteLecturer);
router.post("/admins", userCreateValidator, validate, adminController.createAdmin);
router.post("/courses", courseValidator, validate, adminController.createCourse);
router.get("/courses/:id", idParamValidator, validate, adminController.getCourse);
router.patch("/courses/:id", idParamValidator, validate, adminController.updateCourse);
router.delete("/courses/:id", idParamValidator, validate, adminController.deleteCourse);
router.post("/course-lecturers", courseLecturerValidator, validate, adminController.assignLecturer);
router.get("/elective-requests", adminController.listElectiveRequests);
router.patch("/elective-requests/:enrollmentId", approvalValidator, validate, adminController.approveElectiveRequest);
router.get("/reports/courses/:courseId/attendance", adminController.courseAttendanceReport);
router.get("/reports/courses/:courseId/attendance-percentages", adminController.courseAttendancePercentages);
router.get("/reports/courses/:courseId/academic", adminController.courseAcademicReport);
router.get("/reports/courses/:courseId/export.csv", adminController.exportCourseAcademicReportCsv);
router.get("/reports/courses/:courseId/export.pdf", adminController.exportCourseAcademicReportPdf);
router.get("/reports/enrollments", adminController.enrollmentReport);
router.get("/reports/assignments", adminController.assignmentReport);
router.get("/reports/assessments", adminController.assessmentReport);
router.post("/settings", adminController.manageSettings);
router.patch("/attendance-sessions/:id", idParamValidator, validate, adminController.updateAttendanceSession);
router.patch("/attendance-sessions/:id/cancel", idParamValidator, validate, adminController.cancelAttendanceSession);
router.delete("/attendance-sessions/:id", idParamValidator, validate, adminController.deleteAttendanceSession);

module.exports = router;
