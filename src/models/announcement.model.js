const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    attachmentUrls: { type: [String], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Announcement", announcementSchema);
