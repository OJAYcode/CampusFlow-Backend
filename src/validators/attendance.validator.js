const { body } = require("express-validator");

const attendanceSubmitValidator = [
  body("sessionId").isMongoId(),
  body("sessionCode").trim().notEmpty(),
  body("latitude").isFloat({ min: -90, max: 90 }),
  body("longitude").isFloat({ min: -180, max: 180 }),
  body("accuracy").optional().isFloat({ min: 0 }),
  body("deviceFingerprint").optional().isString(),
  body("visitorId").optional().isString(),
  body("faceImageUrl").optional().isString(),
];

const attendancePresenceValidator = [
  body("sessionId").isMongoId(),
  body("latitude").isFloat({ min: -90, max: 90 }),
  body("longitude").isFloat({ min: -180, max: 180 }),
  body("accuracy").optional().isFloat({ min: 0 }),
  body("deviceFingerprint").optional().isString(),
  body("visitorId").optional().isString(),
];

module.exports = { attendanceSubmitValidator, attendancePresenceValidator };
