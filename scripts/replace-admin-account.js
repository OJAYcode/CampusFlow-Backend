const mongoose = require("mongoose");
require("dotenv").config();

const Admin = require("../src/models/Admin");

const OLD_ADMIN_EMAIL = "louisdiaz43@gmail.com";
const NEW_ADMIN_EMAIL = "oluwoleoluwole82@gmail.com";
const NEW_ADMIN_PASSWORD = "Queuecue@17";
const NEW_ADMIN_NAME = "Biodun Administrator";

async function replaceAdminAccount() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/unitrack_attendance"
    );
    console.log("Connected to database");

    const removed = await Admin.deleteMany({ email: OLD_ADMIN_EMAIL });
    if (removed.deletedCount > 0) {
      console.log(
        `Removed ${removed.deletedCount} old admin account(s): ${OLD_ADMIN_EMAIL}`
      );
    } else {
      console.log(`No old admin account found for ${OLD_ADMIN_EMAIL}`);
    }

    let admin = await Admin.findOne({ email: NEW_ADMIN_EMAIL });
    if (!admin) {
      admin = new Admin({
        name: NEW_ADMIN_NAME,
        email: NEW_ADMIN_EMAIL,
        password_hash: NEW_ADMIN_PASSWORD,
        role: "admin",
        is_super_admin: true,
        status: "active",
      });
      await admin.save();
      console.log(`Created new admin account: ${NEW_ADMIN_EMAIL}`);
    } else {
      admin.name = NEW_ADMIN_NAME;
      admin.password_hash = NEW_ADMIN_PASSWORD;
      admin.is_super_admin = true;
      admin.status = "active";
      admin.email_verified = true;
      await admin.save();
      console.log(`Updated existing admin account: ${NEW_ADMIN_EMAIL}`);
    }

    console.log("Admin replacement complete");
    console.log(`Email: ${NEW_ADMIN_EMAIL}`);
    console.log(`Password: ${NEW_ADMIN_PASSWORD}`);
  } catch (error) {
    console.error("Failed to replace admin account:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  replaceAdminAccount();
}

module.exports = replaceAdminAccount;
