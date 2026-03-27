const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const Teacher = require("../src/models/Teacher");
const Admin = require("../src/models/Admin");
const Course = require("../src/models/Course");
const Student = require("../src/models/Student");
const CourseStudent = require("../src/models/CourseStudent");

// Import email service
const EmailService = require("../src/services/emailService");

const seedDatabase = async () => {
  try {
    console.log("\n🌟 ===== UniTrack Attendance System Database Seeding =====");
    console.log("🔄 Initializing database connection...\n");

    // Connect to database
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/unitrack_attendance"
    );
    console.log("✅ Database connection established successfully");

    // Initialize email service
    const emailService = new EmailService();
    console.log("📧 Email service initialized\n");

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log("🧹 Cleaning existing data...");
    await Promise.all([
      Teacher.deleteMany({}),
      Admin.deleteMany({}),
      Course.deleteMany({}),
      Student.deleteMany({}),
      CourseStudent.deleteMany({}),
    ]);
    console.log("✅ Database cleared successfully\n");

    console.log("👑 Creating Administrator Account...");
    // Create admin user
    const adminExists = await Admin.findOne({
      email: "oluwoleoluwole82@gmail.com",
    });
    if (!adminExists) {
      const admin = new Admin({
        name: "Biodun Administrator",
        email: "oluwoleoluwole82@gmail.com",
        password_hash: "Queuecue@17", // Will be hashed by the pre-save middleware
        role: "admin",
      });
      await admin.save();

      // Send welcome email to admin
      try {
        console.log("📤 Sending welcome email to administrator...");
        await emailService.sendWelcomeEmail(
          admin.email,
          admin.name,
          "Queuecue@17", // temporary password
          "http://localhost:3000/login" // login URL
        );
        console.log("🎉 ✅ ADMIN ACCOUNT CREATED SUCCESSFULLY!");
        console.log("📧 ✅ Welcome email sent successfully!");
        console.log("┌─────────────────────────────────────────────────────┐");
        console.log("│                 ADMIN CREDENTIALS                   │");
        console.log("├─────────────────────────────────────────────────────┤");
        console.log(`│ 📧 Email:    ${admin.email.padEnd(30)} │`);
        console.log(`│ 🔑 Password: ${"Queuecue@17".padEnd(30)} │`);
        console.log(`│ 👑 Role:     ${"Administrator".padEnd(30)} │`);
        console.log("└─────────────────────────────────────────────────────┘");
      } catch (emailError) {
        console.log("🎉 ✅ ADMIN ACCOUNT CREATED SUCCESSFULLY!");
        console.log("⚠️  📧 Welcome email failed to send:", emailError.message);
        console.log("┌─────────────────────────────────────────────────────┐");
        console.log("│                 ADMIN CREDENTIALS                   │");
        console.log("├─────────────────────────────────────────────────────┤");
        console.log(`│ 📧 Email:    ${admin.email.padEnd(30)} │`);
        console.log(`│ 🔑 Password: ${"Queuecue@17".padEnd(30)} │`);
        console.log(`│ 👑 Role:     ${"Administrator".padEnd(30)} │`);
        console.log("└─────────────────────────────────────────────────────┘");
      }
    } else {
      console.log("✅ Administrator account already exists\n");
    }

    console.log("\n👨‍🏫 Creating Teacher Account...");
    // Create sample teacher
    const teacherExists = await Teacher.findOne({
      email: "muhammedabiodun42@gmail.com",
    });
    if (!teacherExists) {
      const teacher = new Teacher({
        name: "Jane Smith",
        email: "muhammedabiodun42@gmail.com",
        password_hash: "balikiss12", // Will be hashed by the pre-save middleware
        role: "teacher",
        email_verified: true, // Mark as verified for seed data
      });
      await teacher.save();

      // Send welcome email to teacher
      try {
        console.log("📤 Sending welcome email to teacher...");
        await emailService.sendWelcomeEmail(
          teacher.email,
          teacher.name,
          "balikiss12", // temporary password
          "http://localhost:3000/login" // login URL
        );
        console.log("🎉 ✅ TEACHER ACCOUNT CREATED SUCCESSFULLY!");
        console.log("📧 ✅ Welcome email sent successfully!");
        console.log("┌─────────────────────────────────────────────────────┐");
        console.log("│                TEACHER CREDENTIALS                  │");
        console.log("├─────────────────────────────────────────────────────┤");
        console.log(`│ 📧 Email:    ${teacher.email.padEnd(30)} │`);
        console.log(`│ 🔑 Password: ${"balikiss12".padEnd(30)} │`);
        console.log(`│ 👨‍🏫 Role:     ${"Teacher".padEnd(30)} │`);
        console.log(`│ 📚 Name:     ${teacher.name.padEnd(30)} │`);
        console.log("└─────────────────────────────────────────────────────┘");
      } catch (emailError) {
        console.log("🎉 ✅ TEACHER ACCOUNT CREATED SUCCESSFULLY!");
        console.log("⚠️  📧 Welcome email failed to send:", emailError.message);
        console.log("┌─────────────────────────────────────────────────────┐");
        console.log("│                TEACHER CREDENTIALS                  │");
        console.log("├─────────────────────────────────────────────────────┤");
        console.log(`│ 📧 Email:    ${teacher.email.padEnd(30)} │`);
        console.log(`│ 🔑 Password: ${"balikiss12".padEnd(30)} │`);
        console.log(`│ 👨‍🏫 Role:     ${"Teacher".padEnd(30)} │`);
        console.log(`│ 📚 Name:     ${teacher.name.padEnd(30)} │`);
        console.log("└─────────────────────────────────────────────────────┘");
      }

      console.log("\n📚 Creating Sample Courses...");
      // Create sample courses with different levels
      const courses = [
        {
          teacher_id: teacher._id,
          course_code: "CS101",
          title: "Introduction to Computer Science",
          level: 100,
        },
        {
          teacher_id: teacher._id,
          course_code: "CS201",
          title: "Data Structures and Algorithms",
          level: 200,
        },
        {
          teacher_id: teacher._id,
          course_code: "CS301",
          title: "Software Engineering",
          level: 300,
        },
      ];

      const createdCourses = await Course.insertMany(courses);
      console.log(`✅ Created ${createdCourses.length} sample courses:`);
      createdCourses.forEach((course, index) => {
        console.log(
          `   ${index + 1}. ${course.course_code} - ${course.title} (Level ${
            course.level
          })`
        );
      });

      console.log("\n👥 Creating Student Records...");
      // Create sample students with different levels
      const students = [
        {
          matric_no: "CSC/2021/001",
          name: "Alice Johnson",
          email: "alice@student.edu",
          phone: "1234567890",
          level: 100,
        },
        {
          matric_no: "CSC/2021/002",
          name: "Bob Williams",
          email: "bob@student.edu",
          phone: "1234567891",
          level: 100,
        },
        {
          matric_no: "CSC/2020/001",
          name: "Charlie Brown",
          email: "charlie@student.edu",
          phone: "1234567892",
          level: 200,
        },
        {
          matric_no: "CSC/2020/002",
          name: "Diana Davis",
          email: "diana@student.edu",
          phone: "1234567893",
          level: 200,
        },
        {
          matric_no: "CSC/2019/001",
          name: "Edward Miller",
          email: "edward@student.edu",
          phone: "1234567894",
          level: 300,
        },
        {
          matric_no: "CSC/2019/002",
          name: "Fiona Wilson",
          email: "fiona@student.edu",
          phone: "1234567895",
          level: 300,
        },
      ];

      const createdStudents = await Student.insertMany(students);
      console.log(`✅ Created ${createdStudents.length} sample students:`);
      createdStudents.forEach((student, index) => {
        console.log(
          `   ${index + 1}. ${student.name} (${student.matric_no}) - Level ${
            student.level
          }`
        );
      });

      console.log("\n🎓 Enrolling Students in Courses...");
      // Enroll students in appropriate courses based on their levels
      const enrollments = [];

      createdStudents.forEach((student) => {
        createdCourses.forEach((course) => {
          // Enroll students in courses at or below their level
          if (course.level <= student.level) {
            enrollments.push({
              course_id: course._id,
              student_id: student._id,
              added_by: teacher._id,
            });
          }
        });
      });

      await CourseStudent.insertMany(enrollments);
      console.log(
        `✅ Created ${enrollments.length} course enrollments successfully`
      );
    } else {
      console.log("✅ Sample teacher account already exists\n");
    }

    console.log("\n🎓 Database seeding completed successfully!");
    console.log("\n📧 Email Configuration:");
    console.log("SMTP Host:", process.env.EMAIL_HOST);
    console.log("SMTP User:", process.env.EMAIL_USER);
    console.log("Email From:", process.env.EMAIL_FROM);
    console.log("\n🔐 Sample Accounts:");
    console.log("Admin: oluwoleoluwole82@gmail.com / Queuecue@17");
    console.log("Teacher: muhammedabiodun42@gmail.com / balikiss12");
    console.log("\n🚀 Next Steps:");
    console.log("1. Check your email inbox for welcome messages");
    console.log("2. Start the server with: npm run dev");
    console.log("3. Test API endpoints with the provided Postman collection");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Check if this script is being run directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;

