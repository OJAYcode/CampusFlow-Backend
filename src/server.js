require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");

// Import database connection
const connectDB = require("./config/database");

// Import middleware
const { generalLimiter } = require("./middleware/rateLimiter");

// Import routes
const authRoutes = require("./routes/auth");
const courseRoutes = require("./routes/courses");
const studentRoutes = require("./routes/students");
const sessionRoutes = require("./routes/sessions");
const attendanceRoutes = require("./routes/attendance");
const adminRoutes = require("./routes/admin");
const studentSharingRoutes = require("./routes/studentSharing");
const supportRoutes = require("./routes/support");
const faqRoutes = require("./routes/faq");

// Import models to ensure they're registered
require("./models/Teacher");
require("./models/Course");
require("./models/Student");
require("./models/CourseStudent");
require("./models/Session");
require("./models/Attendance");
require("./models/DeviceFingerprint");
require("./models/AuditLog");
require("./models/EmailOtp");
require("./models/StudentShareRequest");
require("./models/FAQ");

const app = express();

// Connect to database
connectDB();

// CORS must be configured BEFORE other middleware
// Enhanced CORS configuration for all origins (including Render deployment)
app.use((req, res, next) => {
  // Allow all origins
  const origin = req.headers.origin;
  res.header("Access-Control-Allow-Origin", origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-HTTP-Method-Override, Set-Cookie, Cookie, Request-Id"
  );
  res.header("Access-Control-Expose-Headers", "*");
  res.header("Access-Control-Max-Age", "86400"); // 24 hours

  // Handle preflight requests immediately
  if (req.method === "OPTIONS") {
    console.log(`✅ CORS preflight request from: ${origin || "unknown"}`);
    return res.status(200).end();
  }
  
  next();
});

// Security middleware (after CORS)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
);

// Rate limiting
app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Trust proxy (important for rate limiting and IP detection)
app.set("trust proxy", 1);

// CORS test endpoint (for debugging)
app.get("/cors-test", (req, res) => {
  res.json({
    success: true,
    message: "CORS is working correctly",
    origin: req.headers.origin || "no origin header",
    timestamp: new Date(),
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/courses", studentRoutes); // Student routes are nested under courses
app.use("/api/courses", sessionRoutes); // Session routes are nested under courses
app.use("/api/attendance", attendanceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student-sharing", studentSharingRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/faq", faqRoutes);

// Session routes that aren't nested under courses
app.use("/api/sessions", sessionRoutes);

// Global OPTIONS handler for all API routes (catches any missed preflight requests)
app.options("*", (req, res) => {
  console.log(`✅ Global OPTIONS handler: ${req.path}`);
  res.status(200).end();
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    message: `The requested endpoint ${req.method} ${req.originalUrl} was not found on this server.`,
    timestamp: new Date(),
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Global error handler:", error);

  // Handle specific error types
  if (error.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation Error",
      details: Object.values(error.errors).map((err) => err.message),
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      error: "Invalid ID format",
      message: "The provided ID is not valid",
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      error: "Duplicate Entry",
      message: "A record with this information already exists",
    });
  }

  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: "Invalid Token",
      message: "Please provide a valid authentication token",
    });
  }

  if (error.name === "TokenExpiredError") {
    return res.status(401).json({
      error: "Token Expired",
      message: "Authentication token has expired",
    });
  }

  // Handle nodemailer/email errors gracefully
  if (
    error.code === "ECONNECTION" ||
    error.code === "ESOCKET" ||
    error.code === "EAUTH" ||
    error.message?.includes("nodemailer") ||
    error.message?.includes("SMTP") ||
    error.message?.includes("email") ||
    error.message?.includes("mail")
  ) {
    console.warn(
      "⚠️  Email error caught (operation continued):",
      error.message
    );
    // Don't expose email errors to client, log and continue
    return res.status(200).json({
      success: true,
      message: "Operation completed (email notification skipped)",
      warning: "Email notification could not be sent at this time",
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
    timestamp: new Date(),
  });
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");

  try {
    await mongoose.connection.close();
    console.log("Database connection closed.");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});

process.on("SIGINT", async () => {
  console.log("SIGINT received. Shutting down gracefully...");

  try {
    await mongoose.connection.close();
    console.log("Database connection closed.");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);

  // Check if it's an email-related error
  if (
    reason?.code === "ECONNECTION" ||
    reason?.code === "ESOCKET" ||
    reason?.code === "EAUTH" ||
    reason?.message?.includes("nodemailer") ||
    reason?.message?.includes("SMTP") ||
    reason?.message?.includes("email")
  ) {
    console.warn(
      "⚠️  Email error in unhandled rejection (continuing operation):",
      reason.message
    );
    return; // Don't crash, just log it
  }

  // Don't exit in production, just log the error
  if (process.env.NODE_ENV !== "production") {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);

  // Check if it's an email-related error
  if (
    error?.code === "ECONNECTION" ||
    error?.code === "ESOCKET" ||
    error?.code === "EAUTH" ||
    error?.message?.includes("nodemailer") ||
    error?.message?.includes("SMTP") ||
    error?.message?.includes("email")
  ) {
    console.warn(
      "⚠️  Email error in uncaught exception (continuing operation):",
      error.message
    );
    return; // Don't crash, just log it
  }

  // For other errors, exit
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
🚀 UniTrack Attendance System Backend Server Started
📍 Environment: ${process.env.NODE_ENV || "development"}
🌐 Port: ${PORT}
📊 API Documentation: http://localhost:${PORT}/api
🏥 Health Check: http://localhost:${PORT}/health
${
  process.env.NODE_ENV === "development"
    ? "🔧 Development Mode Active"
    : "🔒 Production Mode Active"
}
  `);
});

module.exports = app;
