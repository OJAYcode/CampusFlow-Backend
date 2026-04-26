const { body, param } = require("express-validator");

const electiveSelectionValidator = [
  body("courseIds").isArray({ min: 1 }),
  body("courseIds.*").isMongoId(),
];

const assignmentSubmissionValidator = [
  param("assignmentId").isMongoId(),
  body("submissionText").optional().isString(),
  body("attachmentUrls").optional().isArray(),
];

const studentMessageValidator = [
  body("threadKey").trim().notEmpty(),
  body("recipientIds").isArray({ min: 1 }),
  body("recipientIds.*").isMongoId(),
  body("body").trim().notEmpty(),
  body("courseId").optional().isMongoId(),
];

const studentProfileUpdateValidator = [
  body("fullName").optional().trim().notEmpty(),
  body("email").optional().isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body("phone").optional({ nullable: true }).isString(),
  body().custom((value) => {
    if (
      value &&
      (Object.prototype.hasOwnProperty.call(value, "fullName") ||
        Object.prototype.hasOwnProperty.call(value, "email") ||
        Object.prototype.hasOwnProperty.call(value, "phone"))
    ) {
      return true;
    }

    throw new Error("Provide at least one profile field to update");
  }),
];

module.exports = {
  electiveSelectionValidator,
  assignmentSubmissionValidator,
  studentMessageValidator,
  studentProfileUpdateValidator,
};
