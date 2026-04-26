const fs = require("fs");
const path = require("path");

function ensureUploadDir(folderName) {
  const directory = path.join(process.cwd(), "uploads", folderName);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

function toPublicFileUrl(folderName, filename) {
  return `/uploads/${folderName}/${filename}`;
}

function mapFilesToUrls(folderName, files) {
  return (files || []).map((file) => ({
    fileUrl: toPublicFileUrl(folderName, file.filename),
    fileName: file.originalname,
    storedFileName: file.filename,
    fileType: file.mimetype,
    fileSize: file.size,
  }));
}

module.exports = { ensureUploadDir, toPublicFileUrl, mapFilesToUrls };
