const jwt = require("jsonwebtoken");

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    },
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      type: "refresh",
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    },
  );
}

function signPasswordResetToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      type: "password_reset",
    },
    process.env.JWT_RESET_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_RESET_EXPIRES_IN || "1h",
    },
  );
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  signPasswordResetToken,
};
