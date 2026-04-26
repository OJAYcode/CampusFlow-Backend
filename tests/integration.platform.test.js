const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../src/services/emailServiceInstance", () => ({
  sendPasswordResetLink: jest.fn().mockResolvedValue({ skipped: true }),
}));

const app = require("../src/app");
const Faculty = require("../src/models/faculty.model");
const Department = require("../src/models/department.model");
const Course = require("../src/models/course.model");
const SeededStudent = require("../src/models/seededStudent.model");
const User = require("../src/models/user.model");
const CourseEnrollment = require("../src/models/courseEnrollment.model");
const CourseLecturer = require("../src/models/courseLecturer.model");
const AttendanceSession = require("../src/models/attendanceSession.model");
const AttendanceRecord = require("../src/models/attendanceRecord.model");
const Assessment = require("../src/models/assessment.model");
const AssessmentQuestion = require("../src/models/assessmentQuestion.model");
const AssessmentAttempt = require("../src/models/assessmentAttempt.model");
const {
  connectIntegrationDb,
  resetIntegrationDb,
  disconnectIntegrationDb,
} = require("./helpers/integrationDb");

jest.setTimeout(30000);

describe("platform integration workflow", () => {
  let faculty;
  let department;
  let coreCourse;
  let electiveCourse;
  let lecturer;
  let admin;
  let seededStudent;
  let attendanceSession;
  let assessment;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    await connectIntegrationDb();
  });

  beforeEach(async () => {
    await resetIntegrationDb();

    faculty = await Faculty.create({ name: "Engineering", code: "ENG" });
    department = await Department.create({
      name: "Computer Science",
      code: "CSC",
      faculty: faculty._id,
    });

    coreCourse = await Course.create({
      code: "CSC301",
      title: "Software Engineering",
      faculty: faculty._id,
      department: department._id,
      level: 300,
      semester: "first",
      academicSession: "2025/2026",
      courseType: "core",
      status: "active",
    });

    electiveCourse = await Course.create({
      code: "CSC307",
      title: "Machine Learning Fundamentals",
      faculty: faculty._id,
      department: department._id,
      level: 300,
      semester: "first",
      academicSession: "2025/2026",
      courseType: "elective",
      status: "active",
    });

    lecturer = await User.create({
      fullName: "Dr Lecturer",
      email: "lecturer@unitrack.edu.ng",
      password: "Password123",
      role: "lecturer",
      faculty: faculty._id,
      department: department._id,
      emailVerified: true,
    });

    admin = await User.create({
      fullName: "Admin Demo",
      email: "admin@unitrack.edu.ng",
      password: "Password123",
      role: "admin",
      emailVerified: true,
    });

    await CourseLecturer.create({
      course: coreCourse._id,
      lecturer: lecturer._id,
      assignedBy: admin._id,
    });

    seededStudent = await SeededStudent.create({
      matricNumber: "UT/CSC/24/001",
      fullName: "Adaeze Okafor",
      faculty: faculty._id,
      department: department._id,
      level: 300,
      email: "adaeze.okafor@unitrack.edu.ng",
      phone: "+2348000000000",
      academicStatus: "active",
    });

    attendanceSession = await AttendanceSession.create({
      course: coreCourse._id,
      lecturer: lecturer._id,
      sessionCode: "4821",
      startTime: new Date(Date.now() - 60 * 1000),
      endTime: new Date(Date.now() + 10 * 60 * 1000),
      latitude: 6.5244,
      longitude: 3.3792,
      radius: 200,
      status: "active",
    });

    assessment = await Assessment.create({
      course: coreCourse._id,
      lecturer: lecturer._id,
      title: "Mid-Semester Quiz",
      instructions: "Answer all questions",
      assessmentType: "quiz",
      durationMinutes: 30,
      availableFrom: new Date(Date.now() - 60 * 1000),
      availableTo: new Date(Date.now() + 10 * 60 * 1000),
      status: "published",
    });

    await AssessmentQuestion.create({
      assessment: assessment._id,
      questionText: "What does REST stand for?",
      questionType: "multiple_choice",
      options: [
        "Representational State Transfer",
        "Remote Execution State Transfer",
        "Resource Event Storage Transfer",
      ],
      correctAnswer: "Representational State Transfer",
      marks: 5,
      order: 1,
    });
  });

  afterAll(async () => {
    await resetIntegrationDb();
    await disconnectIntegrationDb();
  });

  it("runs the seeded student lifecycle across registration, elective approval, attendance, and assessments", async () => {
    const registrationResponse = await request(app)
      .post("/api/v1/auth/student/register")
      .send({
        matricNumber: seededStudent.matricNumber,
        email: seededStudent.email,
        password: "Password123",
        phone: seededStudent.phone,
      });

    expect(registrationResponse.statusCode).toBe(201);
    expect(registrationResponse.body.success).toBe(true);
    expect(registrationResponse.body.data.user.matricNumber).toBe(seededStudent.matricNumber);

    const student = await User.findOne({ email: seededStudent.email });
    expect(student).toBeTruthy();

    const coreEnrollment = await CourseEnrollment.findOne({
      student: student._id,
      course: coreCourse._id,
    });
    expect(coreEnrollment).toBeTruthy();
    expect(coreEnrollment.approvalStatus).toBe("approved");

    const studentToken = registrationResponse.body.data.token;

    const electivesResponse = await request(app)
      .get("/api/v1/students/electives")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(electivesResponse.statusCode).toBe(200);
    expect(electivesResponse.body.data).toHaveLength(1);
    expect(electivesResponse.body.data[0].code).toBe("CSC307");

    const electiveSelectionResponse = await request(app)
      .post("/api/v1/students/electives")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ courseIds: [electiveCourse._id.toString()] });

    expect(electiveSelectionResponse.statusCode).toBe(201);
    expect(electiveSelectionResponse.body.data).toHaveLength(1);

    const pendingEnrollment = await CourseEnrollment.findOne({
      student: student._id,
      course: electiveCourse._id,
    });
    expect(pendingEnrollment.approvalStatus).toBe("pending");

    const adminToken = jwt.sign(
      { sub: admin._id.toString(), role: "admin", email: admin.email },
      process.env.JWT_SECRET,
    );

    const approvalResponse = await request(app)
      .patch(`/api/v1/admin/elective-requests/${pendingEnrollment._id.toString()}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ approvalStatus: "approved" });

    expect(approvalResponse.statusCode).toBe(200);

    const approvedEnrollment = await CourseEnrollment.findById(pendingEnrollment._id);
    expect(approvedEnrollment.approvalStatus).toBe("approved");

    const attendanceResponse = await request(app)
      .post("/api/v1/attendance/submit")
      .set("Authorization", `Bearer ${studentToken}`)
      .set("User-Agent", "integration-test-agent")
      .send({
        sessionId: attendanceSession._id.toString(),
        sessionCode: attendanceSession.sessionCode,
        latitude: 6.52441,
        longitude: 3.37921,
        accuracy: 5,
        deviceFingerprint: "integration-device-1",
      });

    expect(attendanceResponse.statusCode).toBe(201);

    const attendanceRecord = await AttendanceRecord.findOne({
      session: attendanceSession._id,
      student: student._id,
    });
    expect(attendanceRecord).toBeTruthy();

    const assessmentStartResponse = await request(app)
      .post(`/api/v1/assessments/${assessment._id.toString()}/start`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        cameraGranted: true,
        microphoneGranted: true,
      });

    expect(assessmentStartResponse.statusCode).toBe(201);

    const question = await AssessmentQuestion.findOne({ assessment: assessment._id });
    const assessmentSubmitResponse = await request(app)
      .post(`/api/v1/assessments/${assessment._id.toString()}/submit`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        answers: [
          {
            questionId: question._id.toString(),
            answer: "Representational State Transfer",
          },
        ],
      });

    expect(assessmentSubmitResponse.statusCode).toBe(200);
    expect(assessmentSubmitResponse.body.data.score).toBe(5);

    const attempt = await AssessmentAttempt.findOne({
      assessment: assessment._id,
      student: student._id,
    });
    expect(attempt).toBeTruthy();
    expect(attempt.status).toBe("submitted");
    expect(attempt.score).toBe(5);
  });
});
