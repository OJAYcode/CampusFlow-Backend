const express = require("express");

const studentController = require("../../controllers/student.controller");
const validate = require("../../middlewares/validate.middleware");
const { protect, authorize } = require("../../middlewares/auth.middleware");
const { ROLES } = require("../../constants/roles");
const {
  electiveSelectionValidator,
  assignmentSubmissionValidator,
  studentMessageValidator,
  studentProfileUpdateValidator,
} = require("../../validators/student.validator");

const router = express.Router();

router.use(protect, authorize(ROLES.STUDENT));

router.get("/profile", studentController.profile);
router.patch("/profile", studentProfileUpdateValidator, validate, studentController.updateProfile);
router.get("/electives", studentController.getElectives);
router.post("/electives", electiveSelectionValidator, validate, studentController.selectElectives);
router.get("/enrollments", studentController.getEnrollments);
router.get("/materials/search-online", studentController.searchOnlineMaterials);
router.get("/materials", studentController.getMaterials);
router.get("/assignments", studentController.getAssignments);
router.post("/assignments/:assignmentId/submit", assignmentSubmissionValidator, validate, studentController.submitAssignment);
router.get("/assessments", studentController.getAssessments);
router.get("/assessments/attempts", studentController.getAssessmentAttempts);
router.get("/announcements", studentController.getAnnouncements);
router.get("/messages", studentController.getMessages);
router.post("/messages", studentMessageValidator, validate, studentController.sendMessage);

module.exports = router;
