const EmailService = require("./emailService");

// Singleton instance shared across routes so SMTP verification runs once.
module.exports = new EmailService();
