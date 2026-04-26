const crypto = require("crypto");

function calculateDistanceMeters(lat1, lng1, lat2, lng2) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function generateDeviceFingerprint(input) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function generateSessionCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
  calculateDistanceMeters,
  generateDeviceFingerprint,
  generateSessionCode,
};
