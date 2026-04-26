const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../src/services/emailServiceInstance", () => ({
  sendPasswordResetLink: jest.fn().mockResolvedValue({ messageId: "msg-test" }),
}));

const app = require("../src/app");
const User = require("../src/models/user.model");

describe("API smoke tests", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns health status", async () => {
    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("rejects student registration with invalid payload", async () => {
    const response = await request(app).post("/api/v1/auth/student/register").send({
      matricNumber: "",
      email: "bad-email",
      password: "123",
    });

    expect(response.statusCode).toBe(422);
    expect(response.body.success).toBe(false);
  });

  it("rejects unauthenticated student enrollments request", async () => {
    const response = await request(app).get("/api/v1/students/enrollments");

    expect(response.statusCode).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("rejects invalid attendance submission payload", async () => {
    const response = await request(app).post("/api/v1/attendance/submit").send({
      sessionCode: "",
    });

    expect([401, 422]).toContain(response.statusCode);
  });

  it("allows authenticated student profile access", async () => {
    const token = jwt.sign(
      { sub: "680000000000000000000001", role: "student", email: "student@test.com" },
      process.env.JWT_SECRET,
    );

    jest.spyOn(User, "findById").mockResolvedValue({
      _id: "680000000000000000000001",
      fullName: "Student Demo",
      email: "student@test.com",
      role: "student",
      status: "active",
      toJSON() {
        return this;
      },
    });

    const response = await request(app)
      .get("/api/v1/students/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.role).toBe("student");
  });

  it("blocks student token from admin route", async () => {
    const token = jwt.sign(
      { sub: "680000000000000000000001", role: "student", email: "student@test.com" },
      process.env.JWT_SECRET,
    );

    jest.spyOn(User, "findById").mockResolvedValue({
      _id: "680000000000000000000001",
      fullName: "Student Demo",
      email: "student@test.com",
      role: "student",
      status: "active",
      toJSON() {
        return this;
      },
    });

    const response = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it("refreshes token with valid refresh token payload", async () => {
    const refreshToken = jwt.sign(
      { sub: "680000000000000000000001", role: "student", type: "refresh" },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    );

    jest.spyOn(User, "findById").mockResolvedValue({
      _id: "680000000000000000000001",
      fullName: "Student Demo",
      email: "student@test.com",
      role: "student",
      status: "active",
      save: jest.fn(),
      toJSON() {
        return this;
      },
    });

    const response = await request(app)
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeTruthy();
  });

  it("returns generic forgot-password response", async () => {
    jest.spyOn(User, "findOne").mockResolvedValue(null);

    const response = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "nobody@example.com" });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
