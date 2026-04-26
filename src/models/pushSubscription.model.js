const mongoose = require("mongoose");

const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    portal: { type: String, enum: ["student", "staff"], required: true },
    userAgent: String,
    lastUsedAt: Date,
  },
  { timestamps: true },
);

pushSubscriptionSchema.index({ user: 1, endpoint: 1 }, { unique: true });
pushSubscriptionSchema.index({ portal: 1, user: 1 });

module.exports = mongoose.model("PushSubscription", pushSubscriptionSchema);
