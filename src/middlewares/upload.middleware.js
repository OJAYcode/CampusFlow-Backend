const path = require("path");
const multer = require("multer");

const ApiError = require("../utils/ApiError");

const allowedExtensions = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
  ".zip",
  ".txt",
]);

function fileFilter(req, file, cb) {
  const extension = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    cb(new ApiError(400, `Unsupported file type: ${extension}`));
    return;
  }

  cb(null, true);
}

function createUploader(folderName, maxCount = 5) {
  // Memory storage keeps file buffers in RAM so they can be streamed to
  // Cloudinary (or written to disk locally). folderName is kept in the
  // signature for call-site clarity and future per-folder limits.
  void folderName;
  return multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
      fileSize: 15 * 1024 * 1024,
      files: maxCount,
    },
  });
}

module.exports = { createUploader };
