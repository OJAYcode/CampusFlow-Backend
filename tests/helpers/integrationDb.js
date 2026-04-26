const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

function buildTestMongoUri(uri) {
  if (!uri) {
    throw new Error("MONGODB_URI is required for integration tests");
  }

  const [base, query] = uri.split("?");
  const lastSlash = base.lastIndexOf("/");
  const currentDbName = base.slice(lastSlash + 1) || "unitrack";
  const testDbName = currentDbName.endsWith("_integration_test")
    ? currentDbName
    : `${currentDbName}_integration_test`;

  return `${base.slice(0, lastSlash + 1)}${testDbName}${query ? `?${query}` : ""}`;
}

async function connectIntegrationDb() {
  const uri = buildTestMongoUri(process.env.TEST_MONGODB_URI || process.env.MONGODB_URI);

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(uri);
  return uri;
}

async function resetIntegrationDb() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
  }
}

async function disconnectIntegrationDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

module.exports = {
  connectIntegrationDb,
  resetIntegrationDb,
  disconnectIntegrationDb,
  buildTestMongoUri,
};
