const CourseLecturer = require("../models/courseLecturer.model");
const CourseEnrollment = require("../models/courseEnrollment.model");
const CourseMaterial = require("../models/courseMaterial.model");
const Assignment = require("../models/assignment.model");
const AssignmentSubmission = require("../models/assignmentSubmission.model");
const Assessment = require("../models/assessment.model");
const AssessmentQuestion = require("../models/assessmentQuestion.model");
const AssessmentAttempt = require("../models/assessmentAttempt.model");
const Announcement = require("../models/announcement.model");
const Message = require("../models/message.model");
const User = require("../models/user.model");
const Notification = require("../models/notification.model");
const PushSubscription = require("../models/pushSubscription.model");
const AttendanceSession = require("../models/attendanceSession.model");
const AttendanceRecord = require("../models/attendanceRecord.model");
const { ROLES } = require("../constants/roles");
const apiResponse = require("../utils/apiResponse");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/ApiError");
const { createSession } = require("../services/attendance.service");
const { ensureLecturerAssigned } = require("../services/access.service");
const { attendancePercentagesByCourse, fullCourseReport } = require("../services/report.service");
const { mapFilesToUrls } = require("../services/storage.service");
const {
  buildSessionLiveView,
  notifySessionLiveUpdate,
  subscribeToSessionLiveUpdates,
} = require("../services/attendance-live.service");
const { expireOverdueAttendanceSessions } = require("../services/attendance-session.service");
const { notifySubscriptions } = require("../services/pushNotification.service");
const {
  toAttendanceSessionCsvBuffer,
  toAttendanceSessionDocxBuffer,
  toAttendanceSessionPdfBuffer,
  toCsvBuffer,
  toPdfBuffer,
} = require("../utils/export");

exports.getCourses = catchAsync(async (req, res) => {
  const assignments = await CourseLecturer.find({ lecturer: req.user._id }).populate("course");
  return apiResponse(res, { message: "Assigned courses fetched", data: assignments });
});

exports.getCourseWorkspace = catchAsync(async (req, res) => {
  await ensureLecturerAssigned(req.params.courseId, req.user._id);
  const [materials, assignments, assessments, announcements] = await Promise.all([
    CourseMaterial.find({ course: req.params.courseId }).sort({ createdAt: -1 }),
    Assignment.find({ course: req.params.courseId }).sort({ createdAt: -1 }),
    Assessment.find({ course: req.params.courseId }).sort({ createdAt: -1 }),
    Announcement.find({ course: req.params.courseId }).sort({ createdAt: -1 }),
  ]);

  return apiResponse(res, {
    message: "Lecturer course workspace fetched",
    data: { materials, assignments, assessments, announcements },
  });
});

exports.listCourseStudents = catchAsync(async (req, res) => {
  const courseAssignment = await CourseLecturer.findOne({
    course: req.params.courseId,
    lecturer: req.user._id,
  }).populate({
    path: "course",
    select: "code title department level",
    populate: {
      path: "department",
      select: "name code",
    },
  });

  if (!courseAssignment?.course) {
    throw new ApiError(403, "Lecturer is not assigned to this course");
  }

  const approvedEnrollments = await CourseEnrollment.find({
    course: req.params.courseId,
    approvalStatus: "approved",
  })
    .populate("student", "fullName email matricNumber department level")
    .sort({ createdAt: 1 });

  const approvedStudentIds = new Set();
  const approvedStudents = [];

  for (const enrollment of approvedEnrollments) {
    const student = enrollment.student;
    const studentId = student?._id?.toString?.();

    if (!student || !studentId || approvedStudentIds.has(studentId)) {
      continue;
    }

    approvedStudentIds.add(studentId);
    approvedStudents.push(student);
  }

  const cohortStudents = await User.find({
    role: ROLES.STUDENT,
    status: "active",
    department: courseAssignment.course.department?._id || courseAssignment.course.department,
    level: courseAssignment.course.level,
  })
    .select("fullName email matricNumber department level")
    .sort({ fullName: 1 });

  return apiResponse(res, {
    message: "Lecturer course message audience fetched",
    data: {
      course: courseAssignment.course,
      approvedStudents,
      cohortStudents,
    },
  });
});

exports.createAttendanceSession = catchAsync(async (req, res) => {
  const session = await createSession(req.user._id, req.body);
  notifySessionLiveUpdate(session._id.toString());
  await req.audit("attendance_session_created", {
    resource: "attendance_sessions",
    courseId: req.body.courseId,
  });
  return apiResponse(res, { statusCode: 201, message: "Attendance session created", data: session });
});

exports.listAttendanceSessions = catchAsync(async (req, res) => {
  const courseLinks = await CourseLecturer.find({ lecturer: req.user._id }).select("course");
  const courseIds = courseLinks.map((item) => item.course);

  await expireOverdueAttendanceSessions({ course: { $in: courseIds } });

  const sessions = await AttendanceSession.find({
    course: { $in: courseIds },
  })
    .populate("course", "title code semester academicSession")
    .sort({ createdAt: -1 });

  return apiResponse(res, { message: "Lecturer attendance sessions fetched", data: sessions });
});

exports.cancelAttendanceSession = catchAsync(async (req, res) => {
  const session = await AttendanceSession.findById(req.params.sessionId).populate("course", "title code");
  if (!session) {
    throw new ApiError(404, "Attendance session not found");
  }

  await ensureLecturerAssigned(session.course?._id || session.course, req.user._id);

  if (session.status === "cancelled") {
    return apiResponse(res, { message: "Attendance session already cancelled", data: session });
  }

  session.status = "cancelled";
  session.endTime = new Date();
  await session.save();
  notifySessionLiveUpdate(session._id.toString());

  await req.audit("attendance_session_cancelled", {
    resource: "attendance_sessions",
    sessionId: session._id.toString(),
  });

  return apiResponse(res, { message: "Attendance session cancelled", data: session });
});

exports.endAttendanceSession = catchAsync(async (req, res) => {
  const session = await AttendanceSession.findById(req.params.sessionId).populate("course", "title code");
  if (!session) {
    throw new ApiError(404, "Attendance session not found");
  }

  await ensureLecturerAssigned(session.course?._id || session.course, req.user._id);

  if (session.status !== "active") {
    return apiResponse(res, { message: "Attendance session is no longer active", data: session });
  }

  session.status = "expired";
  session.endTime = new Date();
  await session.save();
  notifySessionLiveUpdate(session._id.toString());

  await req.audit("attendance_session_ended", {
    resource: "attendance_sessions",
    sessionId: session._id.toString(),
  });

  return apiResponse(res, { message: "Attendance session ended", data: session });
});

exports.getAttendanceSessionLive = catchAsync(async (req, res) => {
  const liveView = await buildSessionLiveView(req.params.sessionId);
  const session = liveView.session;

  await ensureLecturerAssigned(session.course?._id || session.course, req.user._id);

  return apiResponse(res, {
    message: "Lecturer attendance session live view fetched",
    data: liveView,
  });
});

exports.streamAttendanceSessionLive = catchAsync(async (req, res) => {
  const liveView = await buildSessionLiveView(req.params.sessionId);
  const session = liveView.session;

  await ensureLecturerAssigned(session.course?._id || session.course, req.user._id);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const writeEvent = async () => {
    const snapshot = await buildSessionLiveView(req.params.sessionId);
    res.write(`event: live\n`);
    res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
  };

  await writeEvent();

  const unsubscribe = subscribeToSessionLiveUpdates(req.params.sessionId, async () => {
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

exports.exportAttendanceSessionCsv = catchAsync(async (req, res) => {
  const session = await AttendanceSession.findById(req.params.sessionId).populate(
    "course lecturer",
    "title code semester academicSession fullName",
  );

  if (!session) {
    throw new ApiError(404, "Attendance session not found");
  }

  await ensureLecturerAssigned(session.course?._id || session.course, req.user._id);

  const records = await AttendanceRecord.find({ session: session._id, status: "present" })
    .populate("student", "fullName matricNumber email")
    .sort({ submittedAt: 1, createdAt: 1 });

  const buffer = toAttendanceSessionCsvBuffer(session, records);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="attendance-session-${session.sessionCode}.csv"`);
  res.send(buffer);
});

exports.exportAttendanceSessionPdf = catchAsync(async (req, res) => {
  const session = await AttendanceSession.findById(req.params.sessionId).populate(
    "course lecturer",
    "title code semester academicSession fullName",
  );

  if (!session) {
    throw new ApiError(404, "Attendance session not found");
  }

  await ensureLecturerAssigned(session.course?._id || session.course, req.user._id);

  const records = await AttendanceRecord.find({ session: session._id, status: "present" })
    .populate("student", "fullName matricNumber email")
    .sort({ submittedAt: 1, createdAt: 1 });

  const buffer = await toAttendanceSessionPdfBuffer("Attendance Session Successful Submissions", session, records);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="attendance-session-${session.sessionCode}.pdf"`);
  res.send(buffer);
});

exports.exportAttendanceSessionDocx = catchAsync(async (req, res) => {
  const session = await AttendanceSession.findById(req.params.sessionId).populate(
    "course lecturer",
    "title code semester academicSession fullName",
  );

  if (!session) {
    throw new ApiError(404, "Attendance session not found");
  }

  await ensureLecturerAssigned(session.course?._id || session.course, req.user._id);

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

exports.courseAttendancePercentages = catchAsync(async (req, res) => {
  await ensureLecturerAssigned(req.params.courseId, req.user._id);
  const report = await attendancePercentagesByCourse(req.params.courseId);
  return apiResponse(res, { message: "Course attendance percentages generated", data: report });
});

exports.uploadMaterial = catchAsync(async (req, res) => {
  await ensureLecturerAssigned(req.body.courseId, req.user._id);
  const uploadedFiles = mapFilesToUrls("materials", req.files);
  const primaryFile = uploadedFiles[0];
  if (!primaryFile && !req.body.fileUrl) {
    throw new ApiError(400, "A material file is required");
  }
  const material = await CourseMaterial.create({
    course: req.body.courseId,
    uploader: req.user._id,
    title: req.body.title,
    description: req.body.description,
    fileUrl: primaryFile?.fileUrl || req.body.fileUrl,
    fileName: primaryFile?.fileName || req.body.fileName,
    fileType: primaryFile?.fileType || req.body.fileType,
    fileSize: primaryFile?.fileSize || req.body.fileSize,
    visibility: req.body.visibility,
  });

  return apiResponse(res, { statusCode: 201, message: "Material uploaded", data: material });
});

exports.deleteMaterial = catchAsync(async (req, res) => {
  const material = await CourseMaterial.findById(req.params.materialId);
  if (!material) {
    throw new ApiError(404, "Material not found");
  }

  await ensureLecturerAssigned(material.course, req.user._id);
  await CourseMaterial.findByIdAndDelete(material._id);

  return apiResponse(res, { message: "Material deleted", data: material });
});

exports.createAssignment = catchAsync(async (req, res) => {
  await ensureLecturerAssigned(req.body.courseId, req.user._id);
  const uploadedFiles = mapFilesToUrls("assignments", req.files);
  const assignment = await Assignment.create({
    course: req.body.courseId,
    lecturer: req.user._id,
    title: req.body.title,
    description: req.body.description,
    instructions: req.body.instructions,
    dueDate: req.body.dueDate,
    totalMarks: req.body.totalMarks,
    attachmentUrls:
      uploadedFiles.length > 0
        ? uploadedFiles.map((file) => file.fileUrl)
        : req.body.attachmentUrls || [],
    allowedSubmissionTypes: req.body.allowedSubmissionTypes || ["text", "file"],
    status: req.body.status || "draft",
  });

  return apiResponse(res, { statusCode: 201, message: "Assignment created", data: assignment });
});

exports.updateAssignment = catchAsync(async (req, res) => {
  const assignment = await Assignment.findById(req.params.assignmentId);
  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }
  await ensureLecturerAssigned(assignment.course, req.user._id);

  const nextDueDate = req.body.dueDate ? new Date(req.body.dueDate) : assignment.dueDate;
  const nextStatus =
    req.body.status || (nextDueDate && nextDueDate > new Date() ? "published" : assignment.status);

  const updated = await Assignment.findByIdAndUpdate(
    req.params.assignmentId,
    {
      ...req.body,
      status: nextStatus,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  return apiResponse(res, { message: "Assignment updated", data: updated });
});

exports.deleteAssignment = catchAsync(async (req, res) => {
  const assignment = await Assignment.findById(req.params.assignmentId);
  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }
  await ensureLecturerAssigned(assignment.course, req.user._id);

  await Assignment.findByIdAndDelete(assignment._id);
  await AssignmentSubmission.deleteMany({ assignment: assignment._id });

  return apiResponse(res, { message: "Assignment deleted", data: assignment });
});

exports.getAssignmentSubmissions = catchAsync(async (req, res) => {
  const assignment = await Assignment.findById(req.params.assignmentId);
  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }
  await ensureLecturerAssigned(assignment.course, req.user._id);

  const submissions = await AssignmentSubmission.find({ assignment: req.params.assignmentId })
    .populate("student", "fullName matricNumber")
    .sort({ submittedAt: -1 });

  return apiResponse(res, { message: "Assignment submissions fetched", data: submissions });
});

exports.gradeSubmission = catchAsync(async (req, res) => {
  const submission = await AssignmentSubmission.findById(req.params.submissionId);
  if (!submission) {
    throw new ApiError(404, "Assignment submission not found");
  }
  await ensureLecturerAssigned(submission.course, req.user._id);

  submission.grade = req.body.grade;
  submission.feedback = req.body.feedback;
  submission.status = "graded";
  await submission.save();

  return apiResponse(res, { message: "Assignment submission graded", data: submission });
});

exports.createAssessment = catchAsync(async (req, res) => {
  await ensureLecturerAssigned(req.body.courseId, req.user._id);

  const assessment = await Assessment.create({
    course: req.body.courseId,
    lecturer: req.user._id,
    title: req.body.title,
    instructions: req.body.instructions,
    assessmentType: req.body.assessmentType,
    durationMinutes: req.body.durationMinutes,
    availableFrom: req.body.availableFrom,
    availableTo: req.body.availableTo,
    shuffleQuestions: req.body.shuffleQuestions,
    allowMultipleAttempts: req.body.allowMultipleAttempts,
    status: req.body.status || "draft",
  });

  if (Array.isArray(req.body.questions) && req.body.questions.length) {
    const questions = req.body.questions.map((question, index) => ({
      assessment: assessment._id,
      questionText: question.questionText,
      questionType: question.questionType || "multiple_choice",
      options: question.options || [],
      correctAnswer: question.correctAnswer,
      marks: question.marks || 1,
      order: question.order ?? index + 1,
    }));

    await AssessmentQuestion.insertMany(questions);
  }

  return apiResponse(res, { statusCode: 201, message: "Assessment created", data: assessment });
});

exports.listAssessments = catchAsync(async (req, res) => {
  const courseIds = (await CourseLecturer.find({ lecturer: req.user._id }).select("course")).map((item) => item.course);
  const assessments = await Assessment.find({ course: { $in: courseIds } }).populate("course");
  return apiResponse(res, { message: "Lecturer assessments fetched", data: assessments });
});

exports.updateAssessment = catchAsync(async (req, res) => {
  const assessment = await Assessment.findById(req.params.assessmentId);
  if (!assessment) {
    throw new ApiError(404, "Assessment not found");
  }
  await ensureLecturerAssigned(assessment.course, req.user._id);

  const nextAvailableTo = req.body.availableTo ? new Date(req.body.availableTo) : assessment.availableTo;
  const nextStatus =
    req.body.status || (nextAvailableTo && nextAvailableTo > new Date() ? "published" : assessment.status);

  const updated = await Assessment.findByIdAndUpdate(
    req.params.assessmentId,
    {
      ...req.body,
      status: nextStatus,
    },
    {
      new: true,
      runValidators: true,
    },
  );
  return apiResponse(res, { message: "Assessment updated", data: updated });
});

exports.deleteAssessment = catchAsync(async (req, res) => {
  const assessment = await Assessment.findById(req.params.assessmentId);
  if (!assessment) {
    throw new ApiError(404, "Assessment not found");
  }
  await ensureLecturerAssigned(assessment.course, req.user._id);

  await Promise.all([
    Assessment.findByIdAndDelete(assessment._id),
    AssessmentQuestion.deleteMany({ assessment: assessment._id }),
    AssessmentAttempt.deleteMany({ assessment: assessment._id }),
  ]);

  return apiResponse(res, { message: "Assessment deleted", data: assessment });
});

exports.listAssessmentAttempts = catchAsync(async (req, res) => {
  const assessment = await Assessment.findById(req.params.assessmentId);
  if (!assessment) {
    throw new ApiError(404, "Assessment not found");
  }
  await ensureLecturerAssigned(assessment.course, req.user._id);

  const attempts = await AssessmentAttempt.find({
    assessment: assessment._id,
    status: { $in: ["submitted", "graded"] },
  })
    .populate("student", "fullName matricNumber")
    .populate("answers.question", "questionText questionType options correctAnswer marks order")
    .sort({ submittedAt: -1, updatedAt: -1, createdAt: -1 });

  return apiResponse(res, { message: "Assessment attempts fetched", data: attempts });
});

exports.publishAnnouncement = catchAsync(async (req, res) => {
  await ensureLecturerAssigned(req.body.courseId, req.user._id);
  const announcement = await Announcement.create({
    course: req.body.courseId,
    sender: req.user._id,
    title: req.body.title,
    body: req.body.body,
    attachmentUrls: req.body.attachmentUrls || [],
  });

  const approvedEnrollments = await CourseEnrollment.find({
    course: req.body.courseId,
    approvalStatus: "approved",
  }).select("student");
  const studentIds = approvedEnrollments.map((item) => item.student).filter(Boolean);

  if (studentIds.length) {
    await Notification.insertMany(
      studentIds.map((studentId) => ({
        user: studentId,
        title: announcement.title,
        body: announcement.body,
        type: "announcement",
        metadata: {
          announcementId: announcement._id,
          courseId: req.body.courseId,
          url: "/student/announcements",
        },
      })),
      { ordered: false },
    ).catch(() => undefined);

    const subscriptions = await PushSubscription.find({
      user: { $in: studentIds },
      portal: "student",
    });

    await notifySubscriptions(subscriptions, {
      title: announcement.title,
      body: announcement.body,
      data: {
        url: "/student/announcements",
        announcementId: String(announcement._id),
        courseId: String(req.body.courseId),
      },
    });

    // also notify any SSE subscribers connected to the server
    try {
      const { notifyForUsers } = require("../services/announcement-stream.service");
      notifyForUsers(studentIds, { id: String(announcement._id), title: announcement.title, body: announcement.body, courseId: String(req.body.courseId), url: "/student/announcements" });
    } catch (e) {
      // ignore if stream service fails
    }
  }

  return apiResponse(res, { statusCode: 201, message: "Announcement published", data: announcement });
});

exports.listAnnouncements = catchAsync(async (req, res) => {
  const courseIds = (await CourseLecturer.find({ lecturer: req.user._id }).select("course")).map((item) => item.course);
  const announcements = await Announcement.find({ course: { $in: courseIds } }).populate("course");
  return apiResponse(res, { message: "Lecturer announcements fetched", data: announcements });
});

exports.updateAnnouncement = catchAsync(async (req, res) => {
  const announcement = await Announcement.findById(req.params.announcementId);
  if (!announcement) {
    throw new ApiError(404, "Announcement not found");
  }
  await ensureLecturerAssigned(announcement.course, req.user._id);

  const updated = await Announcement.findByIdAndUpdate(req.params.announcementId, req.body, {
    new: true,
    runValidators: true,
  });
  return apiResponse(res, { message: "Announcement updated", data: updated });
});

exports.deleteAnnouncement = catchAsync(async (req, res) => {
  const announcement = await Announcement.findById(req.params.announcementId);
  if (!announcement) {
    throw new ApiError(404, "Announcement not found");
  }
  await ensureLecturerAssigned(announcement.course, req.user._id);
  await Announcement.findByIdAndDelete(announcement._id);
  return apiResponse(res, { message: "Announcement deleted", data: announcement });
});

exports.sendMessage = catchAsync(async (req, res) => {
  let resolvedRecipientIds = Array.isArray(req.body.recipientIds) ? req.body.recipientIds : [];

  if (req.body.courseId) {
    await ensureLecturerAssigned(req.body.courseId, req.user._id);
    let courseAssignment = null;

    if (req.body.targetAudience === "course_approved") {
      const approvedRecipients = await CourseEnrollment.find({
        course: req.body.courseId,
        approvalStatus: "approved",
      }).select("student");

      resolvedRecipientIds = approvedRecipients
        .map((item) => item.student?.toString?.())
        .filter(Boolean);
    } else if (req.body.targetAudience === "department_level") {
      courseAssignment = await CourseLecturer.findOne({
        course: req.body.courseId,
        lecturer: req.user._id,
      }).populate("course", "department level");

      if (!courseAssignment?.course) {
        throw new ApiError(403, "Lecturer is not assigned to this course");
      }

      const cohortRecipients = await User.find({
        role: ROLES.STUDENT,
        status: "active",
        department: courseAssignment.course.department,
        level: courseAssignment.course.level,
      }).select("_id");

      resolvedRecipientIds = cohortRecipients
        .map((item) => item._id?.toString?.())
        .filter(Boolean);
    } else if (!resolvedRecipientIds.length) {
      throw new ApiError(400, "No valid student recipients were found for this audience");
    }

    resolvedRecipientIds = Array.from(new Set(resolvedRecipientIds.filter(Boolean)));

    if (!resolvedRecipientIds.length) {
      throw new ApiError(400, "No valid student recipients were found for this audience");
    }
  }

  const message = await Message.create({
    threadKey: req.body.threadKey,
    course: req.body.courseId,
    sender: req.user._id,
    recipients: resolvedRecipientIds,
    body: req.body.body,
    attachmentUrls: req.body.attachmentUrls || [],
  });

  return apiResponse(res, { statusCode: 201, message: "Message sent", data: message });
});

exports.listMessages = catchAsync(async (req, res) => {
  const messages = await Message.find({
    $or: [{ sender: req.user._id }, { recipients: req.user._id }],
  })
    .populate("course sender recipients", "title code fullName")
    .sort({ createdAt: -1 });

  return apiResponse(res, { message: "Lecturer messages fetched", data: messages });
});

exports.courseReport = catchAsync(async (req, res) => {
  await ensureLecturerAssigned(req.params.courseId, req.user._id);
  const report = await fullCourseReport(req.params.courseId);
  return apiResponse(res, { message: "Lecturer course report generated", data: report });
});

exports.exportCourseReportCsv = catchAsync(async (req, res) => {
  await ensureLecturerAssigned(req.params.courseId, req.user._id);
  const report = await fullCourseReport(req.params.courseId);
  const buffer = toCsvBuffer(report);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="lecturer-course-${req.params.courseId}.csv"`);
  res.send(buffer);
});

exports.exportCourseReportPdf = catchAsync(async (req, res) => {
  await ensureLecturerAssigned(req.params.courseId, req.user._id);
  const report = await fullCourseReport(req.params.courseId);
  const buffer = await toPdfBuffer("Lecturer Course Report", report);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="lecturer-course-${req.params.courseId}.pdf"`);
  res.send(buffer);
});
