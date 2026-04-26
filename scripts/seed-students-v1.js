require("dotenv").config();

const mongoose = require("mongoose");
const Faculty = require("../src/models/faculty.model");
const Department = require("../src/models/department.model");
const SeededStudent = require("../src/models/seededStudent.model");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const faculty = await Faculty.findOne({ code: "ENG" });
  const department = await Department.findOne({ code: "CSE" });

  if (!faculty || !department) {
    throw new Error("Seed faculties and departments first");
  }

  await SeededStudent.insertMany(
    [
      {
        matricNumber: "U2023/CSE/001",
        fullName: "Ada Student",
        faculty: faculty._id,
        department: department._id,
        level: 300,
        email: "ada.student@example.edu",
        academicStatus: "active",
        admissionSession: "2023/2024",
      },
      {
        matricNumber: "U2023/CSE/002",
        fullName: "Tobi Learner",
        faculty: faculty._id,
        department: department._id,
        level: 300,
        email: "tobi.learner@example.edu",
        academicStatus: "active",
        admissionSession: "2023/2024",
      },
    ],
    { ordered: false },
  ).catch(() => null);

  console.log("Seeded students inserted");
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
