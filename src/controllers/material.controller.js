const CourseMaterial = require("../models/courseMaterial.model");
const apiResponse = require("../utils/apiResponse");
const catchAsync = require("../utils/catchAsync");
const { ensureLecturerAssigned, ensureStudentEnrolled } = require("../services/access.service");
const { mapFilesToUrls } = require("../services/storage.service");
const ApiError = require("../utils/ApiError");

exports.upload = catchAsync(async (req, res) => {
  await ensureLecturerAssigned(req.body.courseId, req.user._id);
  const uploadedFiles = mapFilesToUrls("materials", req.files);

  if (!uploadedFiles.length && !req.body.fileUrl) {
    throw new ApiError(400, "A material file is required");
  }

  const primaryFile = uploadedFiles[0];

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

exports.listByCourse = catchAsync(async (req, res) => {
  if (req.user.role === "student") {
    await ensureStudentEnrolled(req.params.courseId, req.user._id);
  } else if (req.user.role === "lecturer") {
    await ensureLecturerAssigned(req.params.courseId, req.user._id);
  }

  const materials = await CourseMaterial.find({ course: req.params.courseId }).populate("uploader", "fullName");
  return apiResponse(res, { message: "Course materials fetched", data: materials });
});

exports.remove = catchAsync(async (req, res) => {
  const deleted = await CourseMaterial.findByIdAndDelete(req.params.id);
  return apiResponse(res, { message: "Material removed", data: deleted });
});
