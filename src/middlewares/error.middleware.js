const ApiError = require("../utils/ApiError");
const { logger } = require("../utils/logger");

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`));
}

function errorHandler(error, req, res, next) {
  logger.error(error.message, error);

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      details: Object.values(error.errors).map((item) => item.message),
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate record detected",
      details: error.keyValue,
    });
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error",
    details: error.details || null,
  });
}

module.exports = { notFoundHandler, errorHandler };
