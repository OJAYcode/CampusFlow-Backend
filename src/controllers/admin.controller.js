const Faculty = require("../models/faculty.model");
const Department = require("../models/department.model");
const SeededStudent = require("../models/seededStudent.model");
const SeededLecturer = require("../models/seededLecturer.model");
const User = require("../models/user.model");
const Course = require("../models/course.model");
const CourseLecturer = require("../models/courseLecturer.model");
const CourseEnrollment = require("../models/courseEnrollment.model");
const CourseMaterial = require("../models/courseMaterial.model");
const Assignment = require("../models/assignment.model");
const AssignmentSubmission = require("../models/assignmentSubmission.model");
const Assessment = require("../models/assessment.model");
const AssessmentAttempt = require("../models/assessmentAttempt.model");
const Message = require("../models/message.model");
const Announcement = require("../models/announcement.model");
const Setting = require("../models/setting.model");
const AuditLog = require("../models/auditLog.model");
const AttendanceSession = require("../models/attendanceSession.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const apiResponse = require("../utils/apiResponse");
const catchAsync = require("../utils/catchAsync");
const { ROLES } = require("../constants/roles");
const { approveEnrollment } = require("../services/enrollment.service");
const {
  buildSessionLiveView,
  notifySessionLiveUpdate,
  subscribeToSessionLiveUpdates,
} = require("../services/attendance-live.service");
const { expireOverdueAttendanceSessions } = require("../services/attendance-session.service");
const {
  attendanceByCourse,
  attendancePercentagesByCourse,
  assignmentSummary,
  assessmentSummary,
  enrollmentSummary,
  fullCourseReport,
} = require("../services/report.service");
const ApiError = require("../utils/ApiError");
const {
  toAttendanceSessionCsvBuffer,
  toAttendanceSessionDocxBuffer,
  toAttendanceSessionPdfBuffer,
  toCsvBuffer,
  toPdfBuffer,
} = require("../utils/export");
const mongoose = require("mongoose");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function resolveFacultyReference(value) {
  const normalizedValue = `${value || ""}`.trim();

  if (!normalizedValue) {
    throw new ApiError(400, "Faculty is required");
  }

  if (mongoose.isValidObjectId(normalizedValue)) {
    const faculty = await Faculty.findById(normalizedValue);
    if (!faculty) {
      throw new ApiError(400, `Faculty not found for "${normalizedValue}"`);
    }
    return faculty;
  }

  const faculty = await Faculty.findOne({
    name: { $regex: `^${escapeRegex(normalizedValue)}$`, $options: "i" },
  });

  if (!faculty) {
    throw new ApiError(400, `Faculty "${normalizedValue}" was not found`);
  }

  return faculty;
}

async function resolveDepartmentReference(value, facultyId) {
  const normalizedValue = `${value || ""}`.trim();

  if (!normalizedValue) {
    throw new ApiError(400, "Department is required");
  }

  const departmentQuery = mongoose.isValidObjectId(normalizedValue)
    ? { _id: normalizedValue }
    : { name: { $regex: `^${escapeRegex(normalizedValue)}$`, $options: "i" } };

  const department = await Department.findOne({
    ...departmentQuery,
    faculty: facultyId,
  });

  if (!department) {
    throw new ApiError(
      400,
      `Department "${normalizedValue}" was not found under the selected faculty`,
    );
  }

  return department;
}

async function normalizeSeededStudentInput(payload) {
  const faculty = await resolveFacultyReference(payload.faculty);
  const department = await resolveDepartmentReference(payload.department, faculty._id);

  return {
    ...payload,
    faculty: faculty._id,
    department: department._id,
  };
}

async function normalizeSeededLecturerInput(payload) {
  const faculty = await resolveFacultyReference(payload.faculty);
  const department = await resolveDepartmentReference(payload.department, faculty._id);

  return {
    ...payload,
    employeeId: `${payload.employeeId || ""}`.trim().toUpperCase(),
    email: `${payload.email || ""}`.trim().toLowerCase(),
    phone: `${payload.phone || ""}`.trim(),
    faculty: faculty._id,
    department: department._id,
  };
}

exports.createFaculty = catchAsync(async (req, res) => {
  const faculty = await Faculty.create(req.body);
  return apiResponse(res, { statusCode: 201, message: "Faculty created", data: faculty });
});

exports.listFaculties = catchAsync(async (req, res) => {
  const faculties = await Faculty.find().sort({ name: 1 });
  return apiResponse(res, { message: "Faculties fetched", data: faculties });
});

exports.updateFaculty = catchAsync(async (req, res) => {
  const faculty = await Faculty.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!faculty) {
    throw new ApiError(404, "Faculty not found");
  }
  return apiResponse(res, { message: "Faculty updated", data: faculty });
});

exports.deleteFaculty = catchAsync(async (req, res) => {
  const faculty = await Faculty.findByIdAndDelete(req.params.id);
  if (!faculty) {
    throw new ApiError(404, "Faculty not found");
  }
  return apiResponse(res, { message: "Faculty deleted", data: faculty });
});

exports.createDepartment = catchAsync(async (req, res) => {
  const department = await Department.create(req.body);
  return apiResponse(res, { statusCode: 201, message: "Department created", data: department });
});

exports.listDepartments = catchAsync(async (req, res) => {
  const departments = await Department.find().populate("faculty").sort({ name: 1 });
  return apiResponse(res, { message: "Departments fetched", data: departments });
});

exports.updateDepartment = catchAsync(async (req, res) => {
  const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate("faculty");
  if (!department) {
    throw new ApiError(404, "Department not found");
  }
  return apiResponse(res, { message: "Department updated", data: department });
});

exports.deleteDepartment = catchAsync(async (req, res) => {
  const department = await Department.findByIdAndDelete(req.params.id);
  if (!department) {
    throw new ApiError(404, "Department not found");
  }
  return apiResponse(res, { message: "Department deleted", data: department });
});

exports.seedStudents = catchAsync(async (req, res) => {
  const normalizedStudents = await Promise.all(
    req.body.students.map((student) => normalizeSeededStudentInput(student)),
  );
  const records = await SeededStudent.insertMany(normalizedStudents, { ordered: false });
  await req.audit("students_seeded", { count: records.length, resource: "seeded_students" });
  return apiResponse(res, {
    statusCode: 201,
    message: "Student records seeded successfully",
    data: { count: records.length, records },
  });
});

exports.seedLecturers = catchAsync(async (req, res) => {
  const normalizedLecturers = await Promise.all(
    req.body.lecturers.map((lecturer) => normalizeSeededLecturerInput(lecturer)),
  );
  const records = await SeededLecturer.insertMany(normalizedLecturers, { ordered: false });
  await req.audit("lecturers_seeded", { count: records.length, resource: "seeded_lecturers" });

  return apiResponse(res, {
    statusCode: 201,
    message: "Lecturer records seeded successfully",
    data: { count: records.length, records },
  });
});

exports.createLecturer = catchAsync(async (req, res) => {
  const lecturer = await User.create({ ...req.body, role: ROLES.LECTURER, emailVerified: true });
  await req.audit("lecturer_created", { resource: "users", lecturerId: lecturer._id.toString() });
  return apiResponse(res, { statusCode: 201, message: "Lecturer account created", data: lecturer });
});

exports.createAdmin = catchAsync(async (req, res) => {
  const admin = await User.create({ ...req.body, role: ROLES.ADMIN, emailVerified: true });
  return apiResponse(res, { statusCode: 201, message: "Admin account created", data: admin });
});

exports.createCourse = catchAsync(async (req, res) => {
  const course = await Course.create(req.body);
  return apiResponse(res, { statusCode: 201, message: "Course created", data: course });
});

exports.assignLecturer = catchAsync(async (req, res) => {
  const assignment = await CourseLecturer.findOneAndUpdate(
    { course: req.body.courseId, lecturer: req.body.lecturerId },
    {
      course: req.body.courseId,
      lecturer: req.body.lecturerId,
      assignedBy: req.user._id,
      permissions: req.body.permissions || undefined,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return apiResponse(res, {
    statusCode: 201,
    message: "Lecturer assigned to course",
    data: assignment,
  });
});

exports.listElectiveRequests = catchAsync(async (req, res) => {
  const requests = await CourseEnrollment.find({ approvalStatus: "pending" })
    .populate("student", "fullName matricNumber")
    .populate("course", "title code courseType");

  return apiResponse(res, { message: "Elective requests fetched", data: requests });
});

exports.approveElectiveRequest = catchAsync(async (req, res) => {
  const result = await approveEnrollment(
    req.params.enrollmentId,
    req.user._id,
    req.body.approvalStatus,
    req.body.rejectionReason,
  );

  return apiResponse(res, { message: "Enrollment request updated", data: result });
});

exports.getAdminDashboard = catchAsync(async (req, res) => {
  const [
    students,
    lecturers,
    courses,
    materials,
    assignments,
    submissions,
    assessments,
    attempts,
    messages,
    announcements,
  ] = await Promise.all([
    User.countDocuments({ role: ROLES.STUDENT }),
    User.countDocuments({ role: ROLES.LECTURER }),
    Course.countDocuments(),
    CourseMaterial.countDocuments(),
    Assignment.countDocuments(),
    AssignmentSubmission.countDocuments(),
    Assessment.countDocuments(),
    AssessmentAttempt.countDocuments(),
    Message.countDocuments(),
    Announcement.countDocuments(),
  ]);

  return apiResponse(res, {
    message: "Admin dashboard loaded",
    data: {
      students,
      lecturers,
      courses,
      materials,
      assignments,
      submissions,
      assessments,
      attempts,
      messages,
      announcements,
    },
  });
});

exports.listStudents = catchAsync(async (req, res) => {
  const students = await User.find({ role: ROLES.STUDENT }).populate("faculty department seededStudent");
  return apiResponse(res, { message: "Students fetched", data: students });
});

exports.listSeededStudents = catchAsync(async (req, res) => {
  const records = await SeededStudent.find().populate("faculty department").sort({ createdAt: -1 });
  return apiResponse(res, { message: "Seeded students fetched", data: records });
});

exports.listSeededLecturers = catchAsync(async (req, res) => {
  const records = await SeededLecturer.find().populate("faculty department").sort({ createdAt: -1 });
  return apiResponse(res, { message: "Seeded lecturers fetched", data: records });
});

exports.updateSeededStudent = catchAsync(async (req, res) => {
  const normalizedPayload = await normalizeSeededStudentInput(req.body);
  const record = await SeededStudent.findByIdAndUpdate(req.params.id, normalizedPayload, {
    new: true,
    runValidators: true,
  }).populate("faculty department");
  if (!record) {
    throw new ApiError(404, "Seeded student not found");
  }
  return apiResponse(res, { message: "Seeded student updated", data: record });
});

exports.updateSeededLecturer = catchAsync(async (req, res) => {
  const existingRecord = await SeededLecturer.findById(req.params.id);
  if (!existingRecord) {
    throw new ApiError(404, "Seeded lecturer not found");
  }

  if (existingRecord.isActivated) {
    throw new ApiError(400, "Activated lecturer records cannot be edited from the seeded roster");
  }

  const normalizedPayload = await normalizeSeededLecturerInput(req.body);
  const record = await SeededLecturer.findByIdAndUpdate(req.params.id, normalizedPayload, {
    new: true,
    runValidators: true,
  }).populate("faculty department");

  return apiResponse(res, { message: "Seeded lecturer updated", data: record });
});

exports.deleteSeededStudent = catchAsync(async (req, res) => {
  const record = await SeededStudent.findByIdAndDelete(req.params.id);
  if (!record) {
    throw new ApiError(404, "Seeded student not found");
  }
  return apiResponse(res, { message: "Seeded student deleted", data: record });
});

exports.deleteSeededLecturer = catchAsync(async (req, res) => {
  const existingRecord = await SeededLecturer.findById(req.params.id);
  if (!existingRecord) {
    throw new ApiError(404, "Seeded lecturer not found");
  }

  if (existingRecord.isActivated) {
    throw new ApiError(400, "Activated lecturer records cannot be deleted from the seeded roster");
  }

  const record = await SeededLecturer.findByIdAndDelete(req.params.id);
  return apiResponse(res, { message: "Seeded lecturer deleted", data: record });
});

exports.listLecturers = catchAsync(async (req, res) => {
  const lecturers = await User.find({ role: ROLES.LECTURER }).populate("faculty department seededLecturer");
  return apiResponse(res, { message: "Lecturers fetched", data: lecturers });
});

exports.updateLecturer = catchAsync(async (req, res) => {
  const lecturer = await User.findOneAndUpdate(
    { _id: req.params.id, role: ROLES.LECTURER },
    req.body,
    { new: true, runValidators: true },
  ).populate("faculty department");
  if (!lecturer) {
    throw new ApiError(404, "Lecturer not found");
  }
  return apiResponse(res, { message: "Lecturer updated", data: lecturer });
});

exports.deleteLecturer = catchAsync(async (req, res) => {
  const lecturer = await User.findOneAndDelete({ _id: req.params.id, role: ROLES.LECTURER });
  if (!lecturer) {
    throw new ApiError(404, "Lecturer not found");
  }
  if (lecturer.seededLecturer) {
    await SeededLecturer.findByIdAndUpdate(lecturer.seededLecturer, { isActivated: false });
  }
  await CourseLecturer.deleteMany({ lecturer: lecturer._id });
  return apiResponse(res, { message: "Lecturer deleted", data: lecturer });
});

exports.listCourses = catchAsync(async (req, res) => {
  const courses = await Course.find().populate("faculty department");
  return apiResponse(res, { message: "Courses fetched", data: courses });
});

exports.getCourse = catchAsync(async (req, res) => {
  const course = await Course.findById(req.params.id).populate("faculty department");
  if (!course) {
    throw new ApiError(404, "Course not found");
  }
  const [lecturers, enrollments] = await Promise.all([
    CourseLecturer.find({ course: course._id }).populate("lecturer", "fullName email"),
    CourseEnrollment.find({ course: course._id }).populate("student", "fullName matricNumber"),
  ]);
  return apiResponse(res, { message: "Course fetched", data: { course, lecturers, enrollments } });
});

exports.updateCourse = catchAsync(async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate("faculty department");
  if (!course) {
    throw new ApiError(404, "Course not found");
  }
  return apiResponse(res, { message: "Course updated", data: course });
});

exports.deleteCourse = catchAsync(async (req, res) => {
  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) {
    throw new ApiError(404, "Course not found");
  }
  await Promise.all([
    CourseLecturer.deleteMany({ course: course._id }),
    CourseEnrollment.deleteMany({ course: course._id }),
    CourseMaterial.deleteMany({ course: course._id }),
    Assignment.deleteMany({ course: course._id }),
    Assessment.deleteMany({ course: course._id }),
    Announcement.deleteMany({ course: course._id }),
    AttendanceSession.deleteMany({ course: course._id }),
    AttendanceRecord.deleteMany({ course: course._id }),
  ]);
  return apiResponse(res, { message: "Course deleted", data: course });
});

exports.listMaterials = catchAsync(async (req, res) => {
  const materials = await CourseMaterial.find().populate("course uploader", "title code fullName");
  return apiResponse(res, { message: "Materials fetched", data: materials });
});

exports.listAssignments = catchAsync(async (req, res) => {
  const assignments = await Assignment.find().populate("course lecturer", "title code fullName");
  return apiResponse(res, { message: "Assignments fetched", data: assignments });
});

exports.listAssessmentAttempts = catchAsync(async (req, res) => {
  const attempts = await AssessmentAttempt.find().populate("assessment student");
  return apiResponse(res, { message: "Assessment attempts fetched", data: attempts });
});

exports.listCommunications = catchAsync(async (req, res) => {
  const [announcements, messages] = await Promise.all([
    Announcement.find().populate("course sender", "title code fullName"),
    Message.find().populate("course sender recipients", "title code fullName"),
  ]);

  return apiResponse(res, { message: "Communications fetched", data: { announcements, messages } });
});

exports.listAuditLogs = catchAsync(async (req, res) => {
  const logs = await AuditLog.find().populate("actor", "fullName email role").sort({ createdAt: -1 }).limit(200);
  return apiResponse(res, { message: "Audit logs fetched", data: logs });
});

exports.listAttendanceSessions = catchAsync(async (req, res) => {
  await expireOverdueAttendanceSessions();

  const sessions = await AttendanceSession.find()
    .populate("course lecturer", "title code fullName")
    .sort({ createdAt: -1 });

  return apiResponse(res, { message: "Attendance sessions fetched", data: sessions });
});

exports.getAttendanceSessionLive = catchAsync(async (req, res) => {
  return apiResponse(res, {
    message: "Attendance session live view fetched",
    data: await buildSessionLiveView(req.params.id),
  });
});

exports.streamAttendanceSessionLive = catchAsync(async (req, res) => {
  await buildSessionLiveView(req.params.id);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const writeEvent = async () => {
    const snapshot = await buildSessionLiveView(req.params.id);
    res.write(`event: live\n`);
    res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
  };

  await writeEvent();

  const unsubscribe = subscribeToSessionLiveUpdates(req.params.id, async () => {
    try {
      await writeEvent();
    } catch {
      unsubscribe();
      res.end();
    }
  });

  const heartbeat = setInterval(() => {
    res.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
});

exports.updateAttendanceSession = catchAsync(async (req, res) => {
  const session = await AttendanceSession.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate("course lecturer", "title code fullName");
  if (!session) {
    throw new ApiError(404, "Attendance session not found");
  }
  return apiResponse(res, { message: "Attendance session updated", data: session });
});

exports.cancelAttendanceSession = catchAsync(async (req, res) => {
  const session = await AttendanceSession.findById(req.params.id).populate("course lecturer", "title code fullName");
  if (!session) {
    throw new ApiError(404, "Attendance session not found");
  }

  if (session.status === "cancelled") {
    return apiResponse(res, { message: "Attendance session already cancelled", data: session });
  }

  session.status = "cancelled";
  session.endTime = new Date();
  await session.save();
  notifySessionLiveUpdate(session._id.toString());

  return apiResponse(res, { message: "Attendance session cancelled", data: session });
});

exports.deleteAttendanceSession = catchAsync(async (req, res) => {
  const session = await AttendanceSession.findByIdAndDelete(req.params.id);
  if (!session) {
    throw new ApiError(404, "Attendance session not found");
  }
  await AttendanceRecord.deleteMany({ session: session._id });
  return apiResponse(res, { message: "Attendance session deleted", data: session });
});

exports.exportAttendanceSessionCsv = catchAsync(async (req, res) => {
  const session = await AttendanceSession.findById(req.params.id).populate("course lecturer", "title code fullName");
  if (!session) {
    throw new ApiError(404, "Attendance session not found");
  }

  const records = await AttendanceRecord.find({ session: session._id, status: "present" })
    .populate("student", "fullName matricNumber email")
    .sort({ submittedAt: 1, createdAt: 1 });

  const buffer = toAttendanceSessionCsvBuffer(session, records);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="attendance-session-${session.sessionCode}.csv"`);
  res.send(buffer);
});

exports.exportAttendanceSessionPdf = catchAsync(async (req, res) => {
  const session = await AttendanceSession.findById(req.params.id).populate("course lecturer", "title code fullName");
  if (!session) {
    throw new ApiError(404, "Attendance session not found");
  }

  const records = await AttendanceRecord.find({ session: session._id, status: "present" })
    .populate("student", "fullName matricNumber email")
    .sort({ submittedAt: 1, createdAt: 1 });

  const buffer = await toAttendanceSessionPdfBuffer("Attendance Session Successful Submissions", session, records);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="attendance-session-${session.sessionCode}.pdf"`);
  res.send(buffer);
});

exports.exportAttendanceSessionDocx = catchAsync(async (req, res) => {
  const session = await AttendanceSession.findById(req.params.id).populate("course lecturer", "title code fullName");
  if (!session) {
    throw new ApiError(404, "Attendance session not found");
  }

  const records = await AttendanceRecord.find({ session: session._id, status: "present" })
    .populate("student", "fullName matricNumber email")
    .sort({ submittedAt: 1, createdAt: 1 });

  const buffer = await toAttendanceSessionDocxBuffer("Attendance Session Successful Submissions", session, records);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  res.setHeader("Content-Disposition", `attachment; filename="attendance-session-${session.sessionCode}.docx"`);
  res.send(buffer);
});

exports.listAttendanceRecords = catchAsync(async (req, res) => {
  const records = await AttendanceRecord.find()
    .populate("student", "fullName matricNumber")
    .populate("course session", "title code sessionCode")
    .sort({ createdAt: -1 })
    .limit(500);

  return apiResponse(res, { message: "Attendance records fetched", data: records });
});

exports.manageSettings = catchAsync(async (req, res) => {
  const setting = await Setting.findOneAndUpdate(
    { key: req.body.key },
    { value: req.body.value, description: req.body.description },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return apiResponse(res, { message: "Setting saved", data: setting });
});

exports.courseAttendanceReport = catchAsync(async (req, res) => {
  const report = await attendanceByCourse(req.params.courseId);
  return apiResponse(res, { message: "Course attendance report generated", data: report });
});

exports.courseAttendancePercentages = catchAsync(async (req, res) => {
  const report = await attendancePercentagesByCourse(req.params.courseId);
  return apiResponse(res, { message: "Course attendance percentages generated", data: report });
});

exports.courseAcademicReport = catchAsync(async (req, res) => {
  const report = await fullCourseReport(req.params.courseId);
  return apiResponse(res, { message: "Course academic report generated", data: report });
});

exports.systemReports = catchAsync(async (req, res) => {
  const [
    seededStudents,
    activeStudents,
    pendingElectives,
    approvedEnrollments,
    attendanceRecords,
    assignments,
    assignmentSubmissions,
    assessments,
    assessmentAttempts,
  ] = await Promise.all([
    SeededStudent.countDocuments(),
    User.countDocuments({ role: ROLES.STUDENT }),
    CourseEnrollment.countDocuments({ approvalStatus: "pending" }),
    CourseEnrollment.countDocuments({ approvalStatus: "approved" }),
    AttendanceRecord.countDocuments(),
    Assignment.countDocuments(),
    AssignmentSubmission.countDocuments(),
    Assessment.countDocuments(),
    AssessmentAttempt.countDocuments(),
  ]);

  return apiResponse(res, {
    message: "System reports generated",
    data: {
      seededStudents,
      activeStudents,
      pendingElectives,
      approvedEnrollments,
      attendanceRecords,
      assignments,
      assignmentSubmissions,
      assessments,
      assessmentAttempts,
    },
  });
});

exports.enrollmentReport = catchAsync(async (req, res) => {
  const report = await enrollmentSummary();
  return apiResponse(res, { message: "Enrollment report generated", data: report });
});

exports.assignmentReport = catchAsync(async (req, res) => {
  const courseId = req.query.courseId;
  if (!courseId) {
    throw new ApiError(400, "courseId query parameter is required");
  }
  const report = await assignmentSummary(courseId);
  return apiResponse(res, { message: "Assignment report generated", data: report });
});

exports.assessmentReport = catchAsync(async (req, res) => {
  const courseId = req.query.courseId;
  if (!courseId) {
    throw new ApiError(400, "courseId query parameter is required");
  }
  const report = await assessmentSummary(courseId);
  return apiResponse(res, { message: "Assessment report generated", data: report });
});

exports.exportCourseAcademicReportCsv = catchAsync(async (req, res) => {
  const report = await fullCourseReport(req.params.courseId);
  const buffer = toCsvBuffer(report);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="course-${req.params.courseId}-report.csv"`);
  res.send(buffer);
});

exports.exportCourseAcademicReportPdf = catchAsync(async (req, res) => {
  const report = await fullCourseReport(req.params.courseId);
  const buffer = await toPdfBuffer("Course Academic Report", report);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="course-${req.params.courseId}-report.pdf"`);
  res.send(buffer);
});
