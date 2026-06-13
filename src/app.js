const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const { apiLimiter } = require("./middlewares/rateLimit.middleware");
const { notFoundHandler, errorHandler } = require("./middlewares/error.middleware");
const requestContext = require("./middlewares/requestContext.middleware");
const auditContext = require("./middlewares/audit.middleware");
const { getAllowedCorsOrigins } = require("./utils/frontendUrls");
const v1Routes = require("./routes/v1");

const app = express();
const allowedCorsOrigins = getAllowedCorsOrigins();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, allowedCorsOrigins.includes(origin));
    },
    credentials: true,
  }),
);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(
  "/uploads",
  (req, res, next) => {
    // helmet defaults to Cross-Origin-Resource-Policy: same-origin and
    // X-Frame-Options: SAMEORIGIN, which make browsers block the frontend (a
    // different origin) from fetching and embedding uploaded files. Relax both
    // for served uploads so the in-app file viewer can load and iframe them.
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.removeHeader("X-Frame-Options");
    next();
  },
  express.static("uploads"),
);
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
      corsOrigins: allowedCorsOrigins,
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
