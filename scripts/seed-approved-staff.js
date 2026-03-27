const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const ApprovedStaff = require("../src/models/ApprovedStaff");

const STAFF_ID_PATTERN = /^[a-zA-Z0-9/_-]+$/;
const DEFAULT_INPUT_PATH = path.join(
  __dirname,
  "approved-staff.seed.sample.json"
);

function parseArgs(argv) {
  const args = {
    file: DEFAULT_INPUT_PATH,
    replace: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const value = argv[i];
    if (value === "--replace") {
      args.replace = true;
      continue;
    }
    if ((value === "--file" || value === "-f") && argv[i + 1]) {
      args.file = path.resolve(process.cwd(), argv[i + 1]);
      i++;
    }
  }

  return args;
}

function normalizeEntry(entry, index) {
  const rawStaffId = entry?.staff_id?.toString().trim();
  if (!rawStaffId) {
    throw new Error(`Record ${index + 1}: staff_id is required`);
  }
  if (rawStaffId.length < 2 || rawStaffId.length > 40) {
    throw new Error(`Record ${index + 1}: staff_id must be 2-40 characters`);
  }
  if (!STAFF_ID_PATTERN.test(rawStaffId)) {
    throw new Error(
      `Record ${index + 1}: staff_id contains invalid characters`
    );
  }

  return {
    staff_id: rawStaffId.toUpperCase(),
    name: entry?.name ? entry.name.toString().trim() : null,
    email: entry?.email ? entry.email.toString().trim().toLowerCase() : null,
    department: entry?.department
      ? entry.department.toString().trim()
      : null,
    notes: entry?.notes ? entry.notes.toString().trim() : null,
    is_active:
      typeof entry?.is_active === "boolean" ? entry.is_active : true,
  };
}

async function seedApprovedStaff() {
  const args = parseArgs(process.argv);

  try {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/unitrack_attendance";
    await mongoose.connect(mongoUri);
    console.log("Connected to database");

    if (!fs.existsSync(args.file)) {
      throw new Error(`Input file not found: ${args.file}`);
    }

    const fileContent = fs.readFileSync(args.file, "utf8");
    const payload = JSON.parse(fileContent);

    if (!Array.isArray(payload) || payload.length === 0) {
      throw new Error("Input file must contain a non-empty JSON array");
    }

    const normalized = payload.map((entry, index) =>
      normalizeEntry(entry, index)
    );

    if (args.replace) {
      await ApprovedStaff.deleteMany({});
      console.log("Existing approved staff records cleared (--replace)");
    }

    let created = 0;
    let updated = 0;

    for (const record of normalized) {
      const existing = await ApprovedStaff.findOne({ staff_id: record.staff_id });
      if (!existing) {
        await ApprovedStaff.create(record);
        created++;
        continue;
      }

      existing.name = record.name;
      existing.email = record.email;
      existing.department = record.department;
      existing.notes = record.notes;
      existing.is_active = record.is_active;
      await existing.save();
      updated++;
    }

    console.log(
      `Approved staff seeding complete: ${created} created, ${updated} updated, ${normalized.length} processed`
    );
  } catch (error) {
    console.error("Failed to seed approved staff:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  seedApprovedStaff();
}

module.exports = seedApprovedStaff;
