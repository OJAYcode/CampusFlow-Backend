process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.NODE_ENV = "development";

jest.mock("../src/services/enrollment.service", () => ({
  autoEnrollCoreCourses: jest.fn().mockResolvedValue([]),
}));

jest.mock("../src/services/emailServiceInstance", () => ({
  sendPasswordResetLink: jest.fn().mockResolvedValue({ messageId: "msg-1" }),
}));

const User = require("../src/models/user.model");
const SeededStudent = require("../src/models/seededStudent.model");
const emailService = require("../src/services/emailServiceInstance");
const { registerStudent, requestPasswordReset } = require("../src/services/auth.service");

describe("auth service business rules", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("registers a student only when matric exists in seeded records", async () => {
    const seededStudent = {
      _id: "seed-1",
      matricNumber: "U2023/CSE/001",
      fullName: "Ada Student",
      faculty: "faculty-1",
      department: "department-1",
      level: 300,
      phone: "08000000000",
      isActivated: false,
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(SeededStudent, "findOne").mockResolvedValue(seededStudent);
    jest.spyOn(User, "findOne").mockResolvedValue(null);
    jest.spyOn(User, "create").mockResolvedValue({
      _id: "student-1",
      fullName: seededStudent.fullName,
      email: "ada@example.com",
      role: "student",
    });

    const result = await registerStudent({
      matricNumber: "u2023/cse/001",
      email: "ada@example.com",
      password: "Password123",
    });

    expect(result.user.role).toBe("student");
    expect(seededStudent.save).toHaveBeenCalled();
    const { autoEnrollCoreCourses } = require("../src/services/enrollment.service");
    expect(autoEnrollCoreCourses).toHaveBeenCalled();
  });

  it("rejects registration when the seeded student record does not exist", async () => {
    jest.spyOn(SeededStudent, "findOne").mockResolvedValue(null);

    await expect(
      registerStudent({
        matricNumber: "missing/001",
        email: "missing@example.com",
        password: "Password123",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Student record was not found in seeded records",
    });
  });

  it("generates and emails password reset instructions when account exists", async () => {
    jest.spyOn(User, "findOne").mockResolvedValue({
      _id: "user-1",
      fullName: "Ada Student",
      email: "ada@example.com",
    });
    const emailSpy = jest
      .spyOn(emailService, "sendPasswordResetLink")
      .mockResolvedValue({ messageId: "msg-1" });

    const result = await requestPasswordReset("ada@example.com");

    expect(emailSpy).toHaveBeenCalled();
    expect(result.emailStatus).toBe("sent");
    expect(result.resetToken).toBeTruthy();
  });
});
