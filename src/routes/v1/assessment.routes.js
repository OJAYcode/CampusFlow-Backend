const express = require("express");

const assessmentController = require("../../controllers/assessment.controller");
const { protect, authorize } = require("../../middlewares/auth.middleware");
const { ROLES } = require("../../constants/roles");

const router = express.Router();

router.get("/:id", protect, assessmentController.getAssessment);
router.post("/:id/start", protect, authorize(ROLES.STUDENT), assessmentController.startAssessment);
router.patch("/:id/proctoring", protect, authorize(ROLES.STUDENT), assessmentController.updateProctoring);
router.post("/:id/submit", protect, authorize(ROLES.STUDENT), assessmentController.submitAssessment);
router.get("/:id/attempts", protect, authorize(ROLES.LECTURER, ROLES.ADMIN, ROLES.SUPER_ADMIN), assessmentController.getAssessmentAttempts);

module.exports = router;
