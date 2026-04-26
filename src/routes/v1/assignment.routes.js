const express = require("express");

const assignmentController = require("../../controllers/assignment.controller");
const validate = require("../../middlewares/validate.middleware");
const { protect, authorize } = require("../../middlewares/auth.middleware");
const { ROLES } = require("../../constants/roles");
const { assignmentSubmissionValidator } = require("../../validators/student.validator");
const { createUploader } = require("../../middlewares/upload.middleware");

const router = express.Router();
const uploadAssignments = createUploader("assignments", 5);

router.use(protect);
router.get("/", assignmentController.list);
router.get("/:assignmentId", assignmentController.getOne);
router.post(
  "/:assignmentId/submit",
  authorize(ROLES.STUDENT),
  uploadAssignments.array("files", 5),
  assignmentSubmissionValidator,
  validate,
  assignmentController.submit,
);
router.get(
  "/:assignmentId/submissions",
  authorize(ROLES.STUDENT, ROLES.LECTURER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  assignmentController.getSubmissions,
);

module.exports = router;
