const AuditLog = require("../models/auditLog.model");

module.exports = (req, res, next) => {
  req.audit = async (action, metadata = {}) => {
    try {
      await AuditLog.create({
        actor: req.user?._id || null,
        actorRole: req.user?.role || "system",
        action,
        resource: metadata.resource || null,
        metadata: {
          ...metadata,
          method: req.method,
          path: req.originalUrl,
          ip: req.ip,
        },
      });
    } catch (error) {
      console.error("Failed to write audit log", error.message);
    }
  };

  next();
};
