const path = require("path");
const multer = require("multer");

const { ensureUploadDir } = require("../services/storage.service");
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

function createStorage(folderName) {
  return multer.diskStorage({
    destination(req, file, cb) {
      cb(null, ensureUploadDir(folderName));
    },
    filename(req, file, cb) {
      const extension = path.extname(file.originalname).toLowerCase();
      const base = path.basename(file.originalname, extension).replace(/\s+/g, "-");
      cb(null, `${Date.now()}-${base}${extension}`);
    },
  });
}

function fileFilter(req, file, cb) {
  const extension = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    cb(new ApiError(400, `Unsupported file type: ${extension}`));
    return;
  }

  cb(null, true);
}

function createUploader(folderName, maxCount = 5) {
  return multer({
    storage: createStorage(folderName),
    fileFilter,
    limits: {
      fileSize: 15 * 1024 * 1024,
      files: maxCount,
    },
  });
}

module.exports = { createUploader };
