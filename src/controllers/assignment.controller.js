const Assignment = require("../models/assignment.model");
const AssignmentSubmission = require("../models/assignmentSubmission.model");
const apiResponse = require("../utils/apiResponse");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/ApiError");
const { ensureLecturerAssigned, ensureStudentEnrolled } = require("../services/access.service");
const { mapFilesToUrls } = require("../services/storage.service");

exports.list = catchAsync(async (req, res) => {
  const assignments = await Assignment.find().populate("course lecturer", "title code fullName");
  return apiResponse(res, { message: "Assignments fetched", data: assignments });
});

exports.getOne = catchAsync(async (req, res) => {
  const assignment = await Assignment.findById(req.params.assignmentId).populate("course lecturer", "title code fullName");
  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }

  if (req.user.role === "student") {
    await ensureStudentEnrolled(assignment.course._id, req.user._id);
  }

  return apiResponse(res, { message: "Assignment fetched", data: assignment });
});

exports.submit = catchAsync(async (req, res) => {
  const assignment = await Assignment.findById(req.params.assignmentId);
  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }
  await ensureStudentEnrolled(assignment.course, req.user._id);
  const uploadedFiles = mapFilesToUrls("assignments", req.files);

  const status = new Date() > assignment.dueDate ? "late" : "submitted";
  const submission = await AssignmentSubmission.findOneAndUpdate(
    { assignment: assignment._id, student: req.user._id },
    {
      assignment: assignment._id,
      course: assignment.course,
      student: req.user._id,
      submissionText: req.body.submissionText,
      attachmentUrls:
        uploadedFiles.length > 0
          ? uploadedFiles.map((file) => file.fileUrl)
          : req.body.attachmentUrls || [],
      submittedAt: new Date(),
      status,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return apiResponse(res, { statusCode: 201, message: "Assignment submitted", data: submission });
});

exports.getSubmissions = catchAsync(async (req, res) => {
  const assignment = await Assignment.findById(req.params.assignmentId);
  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }
  let submissions = [];

  if (req.user.role === "student") {
    await ensureStudentEnrolled(assignment.course, req.user._id);
    const submission = await AssignmentSubmission.findOne({
      assignment: assignment._id,
      student: req.user._id,
    }).populate("student", "fullName matricNumber");

    submissions = submission ? [submission] : [];
  } else {
    if (req.user.role === "lecturer") {
      await ensureLecturerAssigned(assignment.course, req.user._id);
    }

    submissions = await AssignmentSubmission.find({ assignment: assignment._id }).populate(
      "student",
      "fullName matricNumber",
    );
  }

  return apiResponse(res, { message: "Assignment submissions fetched", data: submissions });
});
