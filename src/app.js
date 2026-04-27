const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const { apiLimiter } = require("./middlewares/rateLimit.middleware");
const { notFoundHandler, errorHandler } = require("./middlewares/error.middleware");
const requestContext = require("./middlewares/requestContext.middleware");
const auditContext = require("./middlewares/audit.middleware");
const v1Routes = require("./routes/v1");

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static("uploads"));
app.use(requestContext);
app.use(auditContext);
app.use(apiLimiter);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CampusFlow API is running",
    data: {
      health: "/health",
      docs: "/api-docs",
      version: "/api/v1",
    },
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CampusFlow API is healthy",
    data: {
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    },
  });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/v1", v1Routes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
