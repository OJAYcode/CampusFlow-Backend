const { body, param } = require("express-validator");

const facultyValidator = [body("name").trim().notEmpty(), body("code").trim().notEmpty()];

const departmentValidator = [
  body("name").trim().notEmpty(),
  body("code").trim().notEmpty(),
  body("faculty").isMongoId(),
];

const seedStudentsValidator = [
  body("students").isArray({ min: 1 }),
  body("students.*.matricNumber").trim().notEmpty(),
  body("students.*.fullName").trim().notEmpty(),
  body("students.*.faculty").trim().notEmpty(),
  body("students.*.department").trim().notEmpty(),
  body("students.*.level").isInt({ min: 100, max: 800 }),
];

const seedLecturersValidator = [
  body("lecturers").isArray({ min: 1 }),
  body("lecturers.*.employeeId").trim().notEmpty(),
  body("lecturers.*.fullName").trim().notEmpty(),
  body("lecturers.*.email").isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body("lecturers.*.faculty").trim().notEmpty(),
  body("lecturers.*.department").trim().notEmpty(),
  body("lecturers.*.phone").optional().isString(),
];

const userCreateValidator = [
  body("fullName").trim().notEmpty(),
  body("email").isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body("password").isLength({ min: 8 }),
];

const courseValidator = [
  body("code").trim().notEmpty(),
  body("title").trim().notEmpty(),
  body("faculty").isMongoId(),
  body("department").isMongoId(),
  body("level").isInt({ min: 100, max: 800 }),
  body("semester").isIn(["first", "second"]),
  body("academicSession").trim().notEmpty(),
  body("courseType").isIn(["core", "elective"]),
];

const courseLecturerValidator = [
  body("courseId").isMongoId(),
  body("lecturerId").isMongoId(),
  body("permissions").optional().isArray(),
];

const approvalValidator = [
  param("enrollmentId").isMongoId(),
  body("approvalStatus").isIn(["approved", "rejected"]),
  body("rejectionReason").optional().isString(),
];

const idParamValidator = [param("id").isMongoId()];

module.exports = {
  facultyValidator,
  departmentValidator,
  seedStudentsValidator,
  seedLecturersValidator,
  userCreateValidator,
  courseValidator,
  courseLecturerValidator,
  approvalValidator,
  idParamValidator,
};
