const CourseLecturer = require("../models/courseLecturer.model");
const CourseEnrollment = require("../models/courseEnrollment.model");
const ApiError = require("../utils/ApiError");

async function ensureLecturerAssigned(courseId, lecturerId) {
  const assignment = await CourseLecturer.findOne({
    course: courseId,
    lecturer: lecturerId,
  });

  if (!assignment) {
    throw new ApiError(403, "Lecturer is not assigned to this course");
  }

  return assignment;
}

async function ensureStudentEnrolled(courseId, studentId) {
  const enrollment = await CourseEnrollment.findOne({
    course: courseId,
    student: studentId,
    approvalStatus: "approved",
  });

  if (!enrollment) {
    throw new ApiError(403, "Student is not enrolled in this course");
  }

  return enrollment;
}

module.exports = { ensureLecturerAssigned, ensureStudentEnrolled };
