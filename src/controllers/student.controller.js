const axios = require("axios");
const CourseEnrollment = require("../models/courseEnrollment.model");
const CourseMaterial = require("../models/courseMaterial.model");
const Assignment = require("../models/assignment.model");
const AssignmentSubmission = require("../models/assignmentSubmission.model");
const Assessment = require("../models/assessment.model");
const AssessmentAttempt = require("../models/assessmentAttempt.model");
const Announcement = require("../models/announcement.model");
const Message = require("../models/message.model");
const apiResponse = require("../utils/apiResponse");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/ApiError");
const { ensureStudentEnrolled } = require("../services/access.service");
const { getEligibleElectives, requestElectives } = require("../services/enrollment.service");

const OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json";

function buildOpenLibraryUrl(key) {
  if (!key || typeof key !== "string") {
    return null;
  }

  if (key.startsWith("http")) {
    return key;
  }

  if (key.startsWith("/")) {
    return `https://openlibrary.org${key}`;
  }

  if (key.startsWith("OL")) {
    return `https://openlibrary.org/works/${key}`;
  }

  return null;
}

function normalizeOnlineMaterialResult(item) {
  const editionCount = Number(item?.edition_count || 0);

  return {
    id: item?.key || item?.cover_i || item?.title,
    title: item?.title,
    authors: Array.isArray(item?.author_name) ? item.author_name.filter(Boolean).slice(0, 3) : [],
    year: item?.first_publish_year || null,
    source: "Open Library",
    sourceUrl:
      buildOpenLibraryUrl(item?.key) ||
      `https://openlibrary.org/search?title=${encodeURIComponent(item?.title || "")}`,
    coverImageUrl: item?.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : null,
    availabilityLabel:
      item?.ebook_access === "public"
        ? "Full text available"
        : editionCount
          ? `${editionCount} edition${editionCount === 1 ? "" : "s"} listed`
          : "Reference listing",
  };
}

exports.profile = catchAsync(async (req, res) => {
  const student =
    typeof req.user?.populate === "function"
      ? await req.user.populate("faculty department")
      : req.user;
  return apiResponse(res, { message: "Student profile fetched", data: student });
});

exports.updateProfile = catchAsync(async (req, res) => {
  if (typeof req.body.fullName !== "undefined") {
    req.user.fullName = req.body.fullName.trim();
  }

  if (typeof req.body.email !== "undefined") {
    req.user.email = req.body.email.trim().toLowerCase();
  }

  if (typeof req.body.phone !== "undefined") {
    req.user.phone = `${req.body.phone || ""}`.trim();
  }

  await req.user.save();
  const student =
    typeof req.user?.populate === "function"
      ? await req.user.populate("faculty department")
      : req.user;

  return apiResponse(res, { message: "Student profile updated", data: student });
});

exports.getElectives = catchAsync(async (req, res) => {
  const electives = await getEligibleElectives(req.user._id);
  return apiResponse(res, { message: "Eligible electives fetched", data: electives });
});

exports.selectElectives = catchAsync(async (req, res) => {
  const selections = await requestElectives(req.user._id, req.body.courseIds);
  return apiResponse(res, { statusCode: 201, message: "Elective requests submitted", data: selections });
});

exports.getEnrollments = catchAsync(async (req, res) => {
  const enrollments = await CourseEnrollment.find({ student: req.user._id })
    .populate("course")
    .sort({ createdAt: -1 });

  return apiResponse(res, { message: "Student enrollments fetched", data: enrollments });
});

exports.getMaterials = catchAsync(async (req, res) => {
  const enrollments = await CourseEnrollment.find({
    student: req.user._id,
    approvalStatus: "approved",
  }).select("course");

  const courseIds = enrollments.map((item) => item.course);
  const materials = await CourseMaterial.find({ course: { $in: courseIds } }).populate("course");
  return apiResponse(res, { message: "Course materials fetched", data: materials });
});

exports.searchOnlineMaterials = catchAsync(async (req, res) => {
  const title = `${req.query.title || ""}`.trim();

  if (title.length < 2) {
    return apiResponse(res, {
      message: "Enter at least two characters to search online references",
      data: [],
    });
  }

  try {
    const response = await axios.get(OPEN_LIBRARY_SEARCH_URL, {
      params: {
        title,
        limit: 8,
        fields: "key,title,author_name,first_publish_year,cover_i,ebook_access,edition_count",
      },
      timeout: 8000,
      headers: {
        "User-Agent": "CampusFlow/1.0",
      },
    });

    const results = Array.isArray(response.data?.docs)
      ? response.data.docs
        .map(normalizeOnlineMaterialResult)
        .filter((item) => item.id && item.title && item.sourceUrl)
      : [];

    return apiResponse(res, { message: "Online references fetched", data: results });
  } catch (error) {
    throw new ApiError(502, "Online reference search is unavailable right now");
  }
});

exports.getAssignments = catchAsync(async (req, res) => {
  const enrollments = await CourseEnrollment.find({
    student: req.user._id,
    approvalStatus: "approved",
  }).select("course");
  const courseIds = enrollments.map((item) => item.course);
  await Assignment.updateMany(
    {
      course: { $in: courseIds },
      status: "closed",
      dueDate: { $gt: new Date() },
    },
    { status: "published" },
  );
  const assignments = await Assignment.find({ course: { $in: courseIds }, status: { $ne: "draft" } }).populate("course");
  const submissions = await AssignmentSubmission.find({
    course: { $in: courseIds },
    student: req.user._id,
  }).select("assignment submittedAt status grade feedback");
  const submissionMap = new Map(
    submissions.map((submission) => [String(submission.assignment), submission]),
  );

  const enrichedAssignments = assignments.map((assignment) => ({
    ...assignment.toObject(),
    submission: submissionMap.get(String(assignment._id)) || null,
  }));
  return apiResponse(res, { message: "Assignments fetched", data: enrichedAssignments });
});

exports.submitAssignment = catchAsync(async (req, res) => {
  const assignment = await Assignment.findById(req.params.assignmentId);
  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }
  const status = new Date() > assignment.dueDate ? "late" : "submitted";

  const submission = await AssignmentSubmission.findOneAndUpdate(
    { assignment: assignment._id, student: req.user._id },
    {
      assignment: assignment._id,
      student: req.user._id,
      course: assignment.course,
      submissionText: req.body.submissionText,
      attachmentUrls: req.body.attachmentUrls || [],
      status,
      submittedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return apiResponse(res, { statusCode: 201, message: "Assignment submitted", data: submission });
});

exports.getAssessments = catchAsync(async (req, res) => {
  const enrollments = await CourseEnrollment.find({
    student: req.user._id,
    approvalStatus: "approved",
  }).select("course");
  const courseIds = enrollments.map((item) => item.course);
  await Assessment.updateMany(
    {
      course: { $in: courseIds },
      status: "closed",
      availableTo: { $gt: new Date() },
    },
    { status: "published" },
  );
  const assessments = await Assessment.find({ course: { $in: courseIds }, status: "published" }).populate("course");
  return apiResponse(res, { message: "Assessments fetched", data: assessments });
});

exports.getAssessmentAttempts = catchAsync(async (req, res) => {
  const attempts = await AssessmentAttempt.find({ student: req.user._id }).populate("assessment");
  return apiResponse(res, { message: "Assessment attempts fetched", data: attempts });
});

exports.getAnnouncements = catchAsync(async (req, res) => {
  const enrollments = await CourseEnrollment.find({ student: req.user._id, approvalStatus: "approved" }).select("course");
  const courseIds = enrollments.map((item) => item.course);
  const announcements = await Announcement.find({ course: { $in: courseIds } }).populate("course sender", "title code fullName");
  return apiResponse(res, { message: "Announcements fetched", data: announcements });
});

exports.getMessages = catchAsync(async (req, res) => {
  const messages = await Message.find({
    $or: [{ sender: req.user._id }, { recipients: req.user._id }],
  }).sort({ createdAt: -1 });

  return apiResponse(res, { message: "Messages fetched", data: messages });
});

exports.sendMessage = catchAsync(async (req, res) => {
  if (req.body.courseId) {
    await ensureStudentEnrolled(req.body.courseId, req.user._id);
  }

  const message = await Message.create({
    threadKey: req.body.threadKey,
    course: req.body.courseId,
    sender: req.user._id,
    recipients: req.body.recipientIds,
    body: req.body.body,
    attachmentUrls: req.body.attachmentUrls || [],
  });

  return apiResponse(res, { statusCode: 201, message: "Message sent", data: message });
});
