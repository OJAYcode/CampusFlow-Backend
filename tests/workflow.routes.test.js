const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../src/services/emailServiceInstance", () => ({
  sendPasswordResetLink: jest.fn().mockResolvedValue({ messageId: "msg-test" }),
}));

jest.mock("../src/services/enrollment.service", () => ({
  approveEnrollment: jest.fn(),
}));

jest.mock("../src/services/attendance.service", () => ({
  submitAttendance: jest.fn(),
  createSession: jest.fn(),
}));

jest.mock("../src/models/assessment.model");
jest.mock("../src/models/assessmentQuestion.model");
jest.mock("../src/models/assessmentAttempt.model");
jest.mock("../src/models/auditLog.model", () => ({
  create: jest.fn().mockResolvedValue({ _id: "680000000000000000000901" }),
}));
jest.mock("../src/services/access.service", () => ({
  ensureStudentEnrolled: jest.fn().mockResolvedValue(true),
  ensureLecturerAssigned: jest.fn().mockResolvedValue(true),
}));

const app = require("../src/app");
const User = require("../src/models/user.model");
const Assessment = require("../src/models/assessment.model");
const AssessmentQuestion = require("../src/models/assessmentQuestion.model");
const AssessmentAttempt = require("../src/models/assessmentAttempt.model");
const { approveEnrollment } = require("../src/services/enrollment.service");
const attendanceService = require("../src/services/attendance.service");
const { ensureStudentEnrolled } = require("../src/services/access.service");

describe("workflow route coverage", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  function tokenFor(sub, role, email) {
    return jwt.sign({ sub, role, email }, process.env.JWT_SECRET);
  }

  function mockUserLookup() {
    jest.spyOn(User, "findById").mockImplementation(async (id) => {
      if (String(id) === "680000000000000000000002") {
        return {
          _id: "680000000000000000000002",
          fullName: "Admin Demo",
          email: "admin@test.com",
          role: "admin",
          status: "active",
          toJSON() {
            return this;
          },
        };
      }

      return {
        _id: "680000000000000000000001",
        fullName: "Student Demo",
        email: "student@test.com",
        role: "student",
        status: "active",
        toJSON() {
          return this;
        },
      };
    });
  }

  it("allows an admin to approve an elective enrollment request", async () => {
    mockUserLookup();
    approveEnrollment.mockResolvedValue({
      _id: "680000000000000000000099",
      approvalStatus: "approved",
      approvedBy: "680000000000000000000002",
    });

    const response = await request(app)
      .patch("/api/v1/admin/elective-requests/680000000000000000000099")
      .set(
        "Authorization",
        `Bearer ${tokenFor("680000000000000000000002", "admin", "admin@test.com")}`,
      )
      .send({ approvalStatus: "approved" });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.approvalStatus).toBe("approved");
    expect(approveEnrollment).toHaveBeenCalledWith(
      "680000000000000000000099",
      "680000000000000000000002",
      "approved",
      undefined,
    );
  });

  it("allows a student to submit attendance through the protected route", async () => {
    mockUserLookup();
    attendanceService.submitAttendance.mockResolvedValue({
      _id: "680000000000000000000201",
      session: "680000000000000000000111",
      student: "680000000000000000000001",
    });

    const response = await request(app)
      .post("/api/v1/attendance/submit")
      .set(
        "Authorization",
        `Bearer ${tokenFor("680000000000000000000001", "student", "student@test.com")}`,
      )
      .set("User-Agent", "jest-workflow")
      .send({
        sessionId: "680000000000000000000111",
        sessionCode: "4821",
        latitude: 6.5244,
        longitude: 3.3792,
        accuracy: 8,
        deviceFingerprint: "device-123",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.session).toBe("680000000000000000000111");
    expect(attendanceService.submitAttendance).toHaveBeenCalled();
  });

  it("allows a student to start an assessment attempt through the route", async () => {
    mockUserLookup();
    Assessment.findById.mockResolvedValue({
      _id: "680000000000000000000301",
      course: "680000000000000000000401",
      status: "published",
      allowMultipleAttempts: false,
      availableFrom: new Date(Date.now() - 60_000),
      availableTo: new Date(Date.now() + 60_000),
    });
    AssessmentAttempt.findOne.mockResolvedValue(null);
    AssessmentAttempt.create.mockResolvedValue({
      _id: "680000000000000000000302",
      status: "in_progress",
    });

    const response = await request(app)
      .post("/api/v1/assessments/680000000000000000000301/start")
      .set(
        "Authorization",
        `Bearer ${tokenFor("680000000000000000000001", "student", "student@test.com")}`,
      )
      .send({
        cameraGranted: true,
        microphoneGranted: true,
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("in_progress");
    expect(ensureStudentEnrolled).toHaveBeenCalledWith(
      "680000000000000000000401",
      "680000000000000000000001",
    );
  });

  it("allows a student to submit assessment answers through the route", async () => {
    mockUserLookup();
    const savedAttempt = {
      _id: "680000000000000000000303",
      answers: [],
      score: 0,
      status: "in_progress",
      startedAt: new Date(Date.now() - 60_000),
      submittedAt: null,
      save: jest.fn().mockResolvedValue(true),
    };

    Assessment.findById.mockResolvedValue({
      _id: "680000000000000000000301",
      course: "680000000000000000000401",
      durationMinutes: 30,
      availableTo: new Date(Date.now() + 60_000),
    });
    AssessmentQuestion.find.mockResolvedValue([
      {
        _id: { toString: () => "680000000000000000000501" },
        correctAnswer: "A",
        marks: 2,
      },
    ]);
    AssessmentAttempt.findOne.mockResolvedValue(savedAttempt);

    const response = await request(app)
      .post("/api/v1/assessments/680000000000000000000301/submit")
      .set(
        "Authorization",
        `Bearer ${tokenFor("680000000000000000000001", "student", "student@test.com")}`,
      )
      .send({
        answers: [{ questionId: "680000000000000000000501", answer: "A" }],
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.score).toBe(2);
    expect(savedAttempt.save).toHaveBeenCalled();
  });
});
