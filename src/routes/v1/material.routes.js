const express = require("express");

const materialController = require("../../controllers/material.controller");
const validate = require("../../middlewares/validate.middleware");
const { protect, authorize } = require("../../middlewares/auth.middleware");
const { ROLES } = require("../../constants/roles");
const { materialValidator } = require("../../validators/lecturer.validator");
const { createUploader } = require("../../middlewares/upload.middleware");

const router = express.Router();
const uploadMaterials = createUploader("materials", 3);

router.use(protect);
router.post(
  "/upload",
  authorize(ROLES.LECTURER),
  uploadMaterials.array("files", 3),
  materialValidator,
  validate,
  materialController.upload,
);
router.get("/course/:courseId", materialController.listByCourse);
router.delete("/:id", authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), materialController.remove);

module.exports = router;
