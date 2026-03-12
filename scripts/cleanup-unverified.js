/**
 * Cleanup script: Deletes all unverified teacher accounts.
 * Usage: MONGODB_URI="your-mongo-uri" node scripts/cleanup-unverified.js
 */

const mongoose = require("mongoose");
const Teacher = require("../src/models/Teacher");

async function cleanup() {
  try {
    const uri =
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/unitrack_attendance";

    console.log("🔌 Connecting to database...");
    await mongoose.connect(uri);
    console.log("✅ Connected\n");

    // Find all unverified teachers
    const unverified = await Teacher.find({ email_verified: false });

    if (unverified.length === 0) {
      console.log("✅ No unverified accounts found. Nothing to delete.");
    } else {
      console.log(`Found ${unverified.length} unverified account(s):`);
      unverified.forEach((t) => {
        console.log(`  - ${t.email} (${t.name}) — created ${t.createdAt}`);
      });

      const result = await Teacher.deleteMany({ email_verified: false });
      console.log(
        `\n🗑️  Deleted ${result.deletedCount} unverified account(s).`,
      );
    }

    await mongoose.disconnect();
    console.log("\n🔌 Disconnected. Done!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

cleanup();
