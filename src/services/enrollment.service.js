const Course = require("../models/course.model");
const CourseEnrollment = require("../models/courseEnrollment.model");
const SeededStudent = require("../models/seededStudent.model");
const User = require("../models/user.model");
const {
  COURSE_TYPES,
  ENROLLMENT_TYPES,
  ENROLLMENT_APPROVAL_STATUS,
} = require("../constants/enums");

async function autoEnrollCoreCourses(student) {
  const seededStudent = await SeededStudent.findById(student.seededStudent);
  const coreCourses = await Course.find({
    department: seededStudent.department,
    level: seededStudent.level,
    courseType: COURSE_TYPES.CORE,
    status: "active",
  });

  const operations = coreCourses.map((course) =>
    CourseEnrollment.findOneAndUpdate(
      { student: student._id, course: course._id },
      {
        student: student._id,
        course: course._id,
        enrollmentType: ENROLLMENT_TYPES.AUTO,
        approvalStatus: ENROLLMENT_APPROVAL_STATUS.APPROVED,
        approvedAt: new Date(),
        academicSession: course.academicSession,
        semester: course.semester,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),
  );

  await Promise.all(operations);
  return coreCourses;
}

async function getEligibleElectives(studentId) {
  const student = await User.findById(studentId).populate("seededStudent");
  const seeded = student.seededStudent;

  return Course.find({
    department: seeded.department,
    level: seeded.level,
    courseType: COURSE_TYPES.ELECTIVE,
    status: "active",
  });
}

async function requestElectives(studentId, courseIds) {
  const eligibleCourses = await getEligibleElectives(studentId);
  const eligibleIds = new Set(eligibleCourses.map((course) => course._id.toString()));

  const requests = [];
  for (const courseId of courseIds) {
    if (!eligibleIds.has(courseId)) {
      continue;
    }

    requests.push(
      CourseEnrollment.findOneAndUpdate(
        { student: studentId, course: courseId },
        {
          student: studentId,
          course: courseId,
          enrollmentType: ENROLLMENT_TYPES.SELECTED,
          approvalStatus: ENROLLMENT_APPROVAL_STATUS.PENDING,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    );
  }

  return Promise.all(requests);
}

async function approveEnrollment(enrollmentId, actorId, approvalStatus, rejectionReason) {
  const update = {
    approvalStatus,
    approvedBy: actorId,
    approvedAt: new Date(),
    rejectionReason: rejectionReason || null,
  };

  return CourseEnrollment.findByIdAndUpdate(enrollmentId, update, { new: true })
    .populate("student", "fullName matricNumber")
    .populate("course", "title code");
}

module.exports = {
  autoEnrollCoreCourses,
  getEligibleElectives,
  requestElectives,
  approveEnrollment,
};
