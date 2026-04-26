require("dotenv").config();

const mongoose = require("mongoose");
const Faculty = require("../src/models/faculty.model");
const Department = require("../src/models/department.model");
const Course = require("../src/models/course.model");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const engineering = await Faculty.findOneAndUpdate(
    { code: "ENG" },
    { name: "Faculty of Engineering", code: "ENG" },
    { upsert: true, new: true },
  );

  const computerScience = await Department.findOneAndUpdate(
    { code: "CSE", faculty: engineering._id },
    { name: "Computer Science", code: "CSE", faculty: engineering._id },
    { upsert: true, new: true },
  );

  await Course.insertMany(
    [
      {
        code: "CSE301",
        title: "Operating Systems",
        faculty: engineering._id,
        department: computerScience._id,
        level: 300,
        semester: "first",
        academicSession: "2026/2027",
        courseType: "core",
      },
      {
        code: "CSE305",
        title: "Mobile Computing",
        faculty: engineering._id,
        department: computerScience._id,
        level: 300,
        semester: "first",
        academicSession: "2026/2027",
        courseType: "elective",
      },
    ],
    { ordered: false },
  ).catch(() => null);

  console.log("Academic structure seeded");
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
