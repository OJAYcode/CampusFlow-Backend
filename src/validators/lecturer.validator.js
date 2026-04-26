const { body, param } = require("express-validator");

const attendanceSessionValidator = [
  body("courseId").isMongoId(),
  body("startTime").isISO8601(),
  body("endTime").isISO8601(),
  body("latitude").isFloat({ min: -90, max: 90 }),
  body("longitude").isFloat({ min: -180, max: 180 }),
  body("locationAccuracy").optional().isFloat({ min: 0 }),
  body("radius").isFloat({ min: 5, max: 5000 }),
  body("roomLabel").optional().isString(),
  body("detectedVenueLabel").optional().isString(),
  body("venueDetectionSource").optional().isString(),
];

const materialValidator = [
  body("courseId").isMongoId(),
  body("title").trim().notEmpty(),
  body("fileUrl").optional().isString(),
  body("description").optional().isString(),
  body("visibility").optional().isIn(["enrolled_students", "lecturers_only", "public_course"]),
];

const assignmentValidator = [
  body("courseId").isMongoId(),
  body("title").trim().notEmpty(),
  body("dueDate").isISO8601(),
  body("totalMarks").optional().isFloat({ min: 0 }),
];

const assignmentUpdateValidator = [
  body("courseId").optional().isMongoId(),
  body("title").optional().trim().notEmpty(),
  body("dueDate").optional().isISO8601(),
  body("totalMarks").optional().isFloat({ min: 0 }),
];

const assessmentValidator = [
  body("courseId").isMongoId(),
  body("title").trim().notEmpty(),
  body("assessmentType").isIn(["quiz", "test", "exam"]),
  body("durationMinutes").isInt({ min: 1 }),
  body("availableFrom").isISO8601(),
  body("availableTo").isISO8601(),
  body("questions").optional().isArray(),
];

const assessmentUpdateValidator = [
  body("courseId").optional().isMongoId(),
  body("title").optional().trim().notEmpty(),
  body("assessmentType").optional().isIn(["quiz", "test", "exam"]),
  body("durationMinutes").optional().isInt({ min: 1 }),
  body("availableFrom").optional().isISO8601(),
  body("availableTo").optional().isISO8601(),
  body("questions").optional().isArray(),
];

const announcementValidator = [
  body("courseId").isMongoId(),
  body("title").trim().notEmpty(),
  body("body").trim().notEmpty(),
];

const announcementUpdateValidator = [
  body("courseId").optional().isMongoId(),
  body("title").optional().trim().notEmpty(),
  body("body").optional().trim().notEmpty(),
];

const messageValidator = [
  body("threadKey").trim().notEmpty(),
  body("targetAudience").optional().isIn(["course_approved", "department_level"]),
  body("recipientIds")
    .optional()
    .isArray({ min: 1 }),
  body("recipientIds.*").optional().isMongoId(),
  body().custom((value) => {
    if (!value?.targetAudience && (!Array.isArray(value?.recipientIds) || !value.recipientIds.length)) {
      throw new Error("Either recipientIds or targetAudience is required");
    }
    if (value?.targetAudience && !value?.courseId) {
      throw new Error("courseId is required when using targetAudience");
    }
    return true;
  }),
  body("body").trim().notEmpty(),
];

const gradingValidator = [
  body("grade").isFloat({ min: 0 }),
  body("feedback").optional().isString(),
];

module.exports = {
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
};
