const PushSubscription = require("../models/pushSubscription.model");

function getPublicConfig() {
  return {
    publicKey: process.env.WEB_PUSH_PUBLIC_KEY || "",
    enabled: Boolean(process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY),
  };
}

async function sendWebPushNotification(subscription, payload) {
  let webpush;

  try {
    webpush = require("web-push");
  } catch {
    return { sent: false, reason: "web-push package not installed" };
  }

  if (!process.env.WEB_PUSH_PUBLIC_KEY || !process.env.WEB_PUSH_PRIVATE_KEY) {
    return { sent: false, reason: "missing web push keys" };
  }

  webpush.setVapidDetails(
    process.env.WEB_PUSH_SUBJECT || "mailto:notifications@campusflow.local",
    process.env.WEB_PUSH_PUBLIC_KEY,
    process.env.WEB_PUSH_PRIVATE_KEY,
  );

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      JSON.stringify(payload),
    );

    subscription.lastUsedAt = new Date();
    await subscription.save();
    return { sent: true };
  } catch (error) {
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      await PushSubscription.deleteOne({ _id: subscription._id });
    }
    return { sent: false, reason: error?.message || "push send failed" };
  }
}

async function notifySubscriptions(subscriptions, payload) {
  if (!subscriptions.length) return [];
  return Promise.all(subscriptions.map((subscription) => sendWebPushNotification(subscription, payload)));
}

module.exports = {
  getPublicConfig,
  notifySubscriptions,
};
