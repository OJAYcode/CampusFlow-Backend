const CourseEnrollment = require("../models/courseEnrollment.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const AttendanceSession = require("../models/attendanceSession.model");
const AssignmentSubmission = require("../models/assignmentSubmission.model");
const Assignment = require("../models/assignment.model");
const Assessment = require("../models/assessment.model");
const AssessmentAttempt = require("../models/assessmentAttempt.model");
const Course = require("../models/course.model");

async function attendanceByCourse(courseId) {
  const [enrolled, presentCount, sessionCount] = await Promise.all([
    CourseEnrollment.countDocuments({ course: courseId, approvalStatus: "approved" }),
    AttendanceRecord.countDocuments({ course: courseId }),
    AttendanceSession.countDocuments({ course: courseId }),
  ]);

  return {
    enrolledStudents: enrolled,
    sessionCount,
    attendanceSubmissions: presentCount,
    attendancePercentage: enrolled ? Number(((presentCount / enrolled) * 100).toFixed(2)) : 0,
  };
}

async function attendancePercentagesByCourse(courseId, options = {}) {
  const sessionFilter = { course: courseId };
  if (options.sessionIds?.length) {
    sessionFilter._id = { $in: options.sessionIds };
  } else if (options.completedOnly) {
    sessionFilter.status = { $in: ["inactive", "expired"] };
    if (options.cutoffStartTime) {
      sessionFilter.startTime = { $lte: options.cutoffStartTime };
    }
  }

  const attendanceRecordFilter = { course: courseId, status: "present" };
  if (options.sessionIds?.length) {
    attendanceRecordFilter.session = { $in: options.sessionIds };
  }

  const [sessions, enrollments, attendanceRecords] = await Promise.all([
    AttendanceSession.find(sessionFilter).sort({ startTime: 1 }).select("_id startTime endTime status sessionCode"),
    CourseEnrollment.find({ course: courseId, approvalStatus: "approved" })
      .populate("student", "fullName matricNumber email")
      .sort({ createdAt: 1 }),
    AttendanceRecord.find(attendanceRecordFilter)
      .populate("student", "fullName matricNumber email")
      .populate("session", "sessionCode startTime endTime status"),
  ]);

  const totalSessions = sessions.length;
  const presentByStudent = new Map();

  attendanceRecords.forEach((record) => {
    const studentId = record.student?._id?.toString?.() || record.student?.toString?.();
    if (!studentId) return;

    if (!presentByStudent.has(studentId)) {
      presentByStudent.set(studentId, []);
    }

    presentByStudent.get(studentId).push(record);
  });

  const students = enrollments.map((enrollment) => {
    const student = enrollment.student;
    const studentId = student?._id?.toString?.() || "";
    const submittedRecords = presentByStudent.get(studentId) || [];
    const submittedSessions = submittedRecords.length;
    const attendancePercentage = totalSessions
      ? Number(((submittedSessions / totalSessions) * 100).toFixed(2))
      : 0;

    return {
      student: {
        _id: student?._id,
        fullName: student?.fullName || "Unknown student",
        matricNumber: student?.matricNumber || null,
        email: student?.email || null,
      },
      submittedSessions,
      missedSessions: Math.max(totalSessions - submittedSessions, 0),
      attendancePercentage,
      successfulSubmissions: submittedRecords.map((record) => ({
        _id: record._id,
        submittedAt: record.submittedAt || record.createdAt,
        session: record.session,
      })),
    };
  });

  const studentsMeetingThreshold = students.filter((item) => item.attendancePercentage >= 75).length;
  const studentsBelowThreshold = students.filter((item) => item.attendancePercentage < 75).length;
  const averageAttendancePercentage = students.length
    ? Number(
        (
          students.reduce((sum, item) => sum + item.attendancePercentage, 0) / students.length
        ).toFixed(2),
      )
    : 0;

  return {
    courseId,
    totalSessions,
    enrolledStudents: enrollments.length,
    averageAttendancePercentage,
    studentsMeetingThreshold,
    studentsBelowThreshold,
    students,
  };
}

async function assignmentSummary(courseId) {
  const [assignmentCount, totalSubmissions, gradedSubmissions] = await Promise.all([
    Assignment.countDocuments({ course: courseId }),
    AssignmentSubmission.countDocuments({ course: courseId }),
    AssignmentSubmission.countDocuments({ course: courseId, status: "graded" }),
  ]);
  return { assignmentCount, totalSubmissions, gradedSubmissions };
}

async function assessmentSummary(courseId) {
  const assessments = await Assessment.find({ course: courseId }).select("_id");
  const totalAttempts = await AssessmentAttempt.countDocuments({
    assessment: { $in: assessments.map((item) => item._id) },
  });

  const submittedAttempts = await AssessmentAttempt.countDocuments({
    assessment: { $in: assessments.map((item) => item._id) },
    status: { $in: ["submitted", "graded"] },
  });

  return {
    assessmentCount: assessments.length,
    totalAttempts,
    submittedAttempts,
  };
}

async function enrollmentSummary(filters = {}) {
  const [totalCourses, totalEnrollments, pendingElectives, approvedElectives] = await Promise.all([
    Course.countDocuments(filters.course ? { _id: filters.course } : {}),
    CourseEnrollment.countDocuments(filters.course ? { course: filters.course } : {}),
    CourseEnrollment.countDocuments({
      ...(filters.course ? { course: filters.course } : {}),
      enrollmentType: "selected",
      approvalStatus: "pending",
    }),
    CourseEnrollment.countDocuments({
      ...(filters.course ? { course: filters.course } : {}),
      enrollmentType: "selected",
      approvalStatus: "approved",
    }),
  ]);

  return {
    totalCourses,
    totalEnrollments,
    pendingElectives,
    approvedElectives,
  };
}

async function fullCourseReport(courseId) {
  const [attendance, assignments, assessments, enrollments] = await Promise.all([
    attendanceByCourse(courseId),
    assignmentSummary(courseId),
    assessmentSummary(courseId),
    enrollmentSummary({ course: courseId }),
  ]);

  return {
    attendance,
    assignments,
    assessments,
    enrollments,
  };
}

module.exports = {
  attendanceByCourse,
  attendancePercentagesByCourse,
  assignmentSummary,
  assessmentSummary,
  enrollmentSummary,
  fullCourseReport,
};
