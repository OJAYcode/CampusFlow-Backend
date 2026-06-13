const fs = require("fs");
const path = require("path");
const { v2: cloudinary } = require("cloudinary");

const CLOUDINARY_CONFIGURED = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
);

if (CLOUDINARY_CONFIGURED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function isCloudinaryConfigured() {
  return CLOUDINARY_CONFIGURED;
}

function ensureUploadDir(folderName) {
  const directory = path.join(process.cwd(), "uploads", folderName);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

function toPublicFileUrl(folderName, filename) {
  return `/uploads/${folderName}/${filename}`;
}

// Upload an in-memory file buffer to Cloudinary. Documents (pdf/docx/etc.) must
// be stored as "raw" so Cloudinary serves the original bytes unchanged.
function uploadBufferToCloudinary(folderName, file) {
  return new Promise((resolve, reject) => {
    const extension = path.extname(file.originalname);
    const baseName = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9-_]+/g, "-");
    const publicId = `${Date.now()}-${baseName}`;

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `campusflow/${folderName}`,
        resource_type: "raw",
        public_id: publicId,
        // Preserve the original extension so the served URL has it.
        format: extension ? extension.replace(/^\./, "") : undefined,
        use_filename: false,
        unique_filename: false,
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Cloudinary upload failed"));
          return;
        }
        resolve(result);
      },
    );

    stream.end(file.buffer);
  });
}

// Persist uploaded files and return the metadata controllers store on records.
// Uses Cloudinary when configured (files survive restarts/redeploys), otherwise
// falls back to local disk for development.
async function persistUploadedFiles(folderName, files) {
  const list = files || [];
  if (!list.length) {
    return [];
  }

  if (CLOUDINARY_CONFIGURED) {
    const results = await Promise.all(
      list.map((file) => uploadBufferToCloudinary(folderName, file)),
    );
    return results.map((result, index) => ({
      fileUrl: result.secure_url,
      fileName: list[index].originalname,
      storedFileName: result.public_id,
      fileType: list[index].mimetype,
      fileSize: list[index].size,
    }));
  }

  // Local disk fallback: write the in-memory buffer to disk.
  ensureUploadDir(folderName);
  return list.map((file) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, extension).replace(/\s+/g, "-");
    const storedFileName = `${Date.now()}-${base}${extension}`;
    const destination = path.join(process.cwd(), "uploads", folderName, storedFileName);
    fs.writeFileSync(destination, file.buffer);
    return {
      fileUrl: toPublicFileUrl(folderName, storedFileName),
      fileName: file.originalname,
      storedFileName,
      fileType: file.mimetype,
      fileSize: file.size,
    };
  });
}

// Backwards-compatible synchronous mapper for the disk-storage path. Kept so any
// remaining callers that already have files on disk continue to work.
function mapFilesToUrls(folderName, files) {
  return (files || []).map((file) => ({
    fileUrl: toPublicFileUrl(folderName, file.filename),
    fileName: file.originalname,
    storedFileName: file.filename,
    fileType: file.mimetype,
    fileSize: file.size,
  }));
}

module.exports = {
  ensureUploadDir,
  toPublicFileUrl,
  mapFilesToUrls,
  persistUploadedFiles,
  isCloudinaryConfigured,
};
