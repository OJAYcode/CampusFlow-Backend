const jwt = require("jsonwebtoken");

const User = require("../models/user.model");
const ApiError = require("../utils/ApiError");

async function protect(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.replace("Bearer ", "")
      : null;

    if (!token) {
      return next(new ApiError(401, "Authentication token is required"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.sub);

    if (!user || user.status !== "active") {
      return next(new ApiError(401, "User account is unavailable"));
    }

    req.user = user;
    next();
  } catch (error) {
    next(new ApiError(401, "Invalid or expired authentication token"));
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, "You do not have permission to perform this action"));
    }

    next();
  };
}

module.exports = { protect, authorize };
