const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../src/models/message.model");
jest.mock("../src/services/emailServiceInstance", () => ({
  sendPasswordResetLink: jest.fn().mockResolvedValue({ messageId: "msg-test" }),
}));

const app = require("../src/app");
const User = require("../src/models/user.model");
const Message = require("../src/models/message.model");

function createFindChain(result) {
  return {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockResolvedValue(result),
  };
}

describe("communication routes", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  function mockAuthenticatedUser() {
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
  }

  function authToken() {
    return jwt.sign(
      { sub: "680000000000000000000001", role: "student", email: "student@test.com" },
      process.env.JWT_SECRET,
    );
  }

  it("returns paginated message thread summaries", async () => {
    mockAuthenticatedUser();
    Message.find.mockReturnValue(
      createFindChain([
        {
          threadKey: "thread-1",
          course: { _id: "course-1", title: "Software Engineering" },
          sender: { toString: () => "lecturer-1" },
          recipients: [{ toString: () => "680000000000000000000001" }],
          createdAt: new Date("2026-04-03T10:00:00.000Z"),
          readBy: [],
        },
      ]),
    );

    const response = await request(app)
      .get("/api/v1/communication/messages?page=1&limit=5")
      .set("Authorization", `Bearer ${authToken()}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.total).toBe(1);
    expect(response.body.data.items[0].threadKey).toBe("thread-1");
  });

  it("marks a thread as read through the shared communication route", async () => {
    mockAuthenticatedUser();
    const save = jest.fn().mockResolvedValue(true);
    Message.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        {
          threadKey: "thread-2",
          readBy: [],
          save,
        },
      ]),
    });

    const response = await request(app)
      .post("/api/v1/communication/messages/thread-2/read")
      .set("Authorization", `Bearer ${authToken()}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.data.updatedCount).toBe(1);
    expect(save).toHaveBeenCalled();
  });
});
