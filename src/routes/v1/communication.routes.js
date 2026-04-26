const express = require("express");

const communicationController = require("../../controllers/communication.controller");
const { protect } = require("../../middlewares/auth.middleware");

const router = express.Router();

router.use(protect);
router.get("/announcements", communicationController.listAnnouncements);
router.get("/messages", communicationController.listMessages);
router.get("/messages/:threadKey", communicationController.getThreadMessages);
router.post("/messages/:threadKey/read", communicationController.markThreadAsRead);

module.exports = router;
