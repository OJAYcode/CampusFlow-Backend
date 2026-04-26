const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    threadKey: { type: String, required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    body: { type: String, required: true },
    attachmentUrls: { type: [String], default: [] },
    readBy: {
      type: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          readAt: Date,
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

messageSchema.index({ threadKey: 1, createdAt: -1 });
messageSchema.index({ recipients: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
