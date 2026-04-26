require("dotenv").config();

const app = require("./app");
const connectDatabase = require("./config/database");
const { logger } = require("./utils/logger");

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  await connectDatabase();

  app.listen(PORT, () => {
    logger.info(`Smart attendance API listening on port ${PORT}`);
  });
}

bootstrap().catch((error) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});
