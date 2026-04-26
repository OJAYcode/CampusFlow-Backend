const mongoose = require("mongoose");

const { logger } = require("../utils/logger");

module.exports = async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(uri);
  logger.info("MongoDB connected");
};
