const express = require("express");

const notificationController = require("../../controllers/notification.controller");
const { protect, authorize } = require("../../middlewares/auth.middleware");
const { ROLES } = require("../../constants/roles");

const router = express.Router();

router.get("/push/public-config", notificationController.getPushPublicConfig);
router.get("/stream", notificationController.streamNotifications);
router.use(protect, authorize(ROLES.STUDENT, ROLES.LECTURER));
router.get("/", notificationController.listNotifications);
router.post("/push/subscriptions", notificationController.upsertPushSubscription);
router.delete("/push/subscriptions", notificationController.deletePushSubscription);

module.exports = router;
