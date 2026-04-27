const { ROLES } = require("../constants/roles");

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function buildUrl(baseUrl, path = "") {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const normalizedPath = path ? `/${String(path).replace(/^\/+/, "")}` : "";
  return `${normalizedBase}${normalizedPath}`;
}

function getStudentFrontendUrl() {
  return (
    normalizeBaseUrl(process.env.STUDENT_FRONTEND_URL) ||
    normalizeBaseUrl(process.env.FRONTEND_URL) ||
    "http://localhost:3000"
  );
}

function getStaffFrontendUrl() {
  return (
    normalizeBaseUrl(process.env.STAFF_FRONTEND_URL) ||
    normalizeBaseUrl(process.env.FRONTEND_URL) ||
    "http://localhost:3001"
  );
}

function getFrontendUrlForRole(role) {
  if (role === ROLES.STUDENT) {
    return getStudentFrontendUrl();
  }

  return getStaffFrontendUrl();
}

function getResetPasswordUrlForRole(role) {
  if (normalizeBaseUrl(process.env.FRONTEND_RESET_PASSWORD_URL)) {
    return normalizeBaseUrl(process.env.FRONTEND_RESET_PASSWORD_URL);
  }

  return buildUrl(getFrontendUrlForRole(role), "/reset-password");
}

function getAllowedCorsOrigins() {
  const values = [
    getStudentFrontendUrl(),
    getStaffFrontendUrl(),
    normalizeBaseUrl(process.env.FRONTEND_URL),
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
  ].filter(Boolean);

  return Array.from(new Set(values));
}

module.exports = {
  buildUrl,
  getAllowedCorsOrigins,
  getFrontendUrlForRole,
  getResetPasswordUrlForRole,
  getStaffFrontendUrl,
  getStudentFrontendUrl,
};
