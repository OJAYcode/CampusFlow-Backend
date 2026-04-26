jest.mock("../src/models/courseLecturer.model");
jest.mock("../src/models/courseMaterial.model");
jest.mock("../src/models/assignment.model");
jest.mock("../src/models/assignmentSubmission.model");
jest.mock("../src/models/assessment.model");
jest.mock("../src/models/assessmentQuestion.model");
jest.mock("../src/models/assessmentAttempt.model");
jest.mock("../src/models/announcement.model");
jest.mock("../src/models/message.model");
jest.mock("../src/services/access.service", () => ({
  ensureLecturerAssigned: jest.fn().mockResolvedValue(true),
}));
jest.mock("../src/services/attendance.service", () => ({
  createSession: jest.fn(),
}));
jest.mock("../src/services/report.service", () => ({
  fullCourseReport: jest.fn(),
}));
jest.mock("../src/services/storage.service", () => ({
  mapFilesToUrls: jest.fn().mockReturnValue([]),
}));
jest.mock("../src/utils/export", () => ({
  toCsvBuffer: jest.fn(),
  toPdfBuffer: jest.fn(),
}));

const Message = require("../src/models/message.model");
const { ensureLecturerAssigned } = require("../src/services/access.service");
const ApiError = require("../src/utils/ApiError");
const lecturerController = require("../src/controllers/lecturer.controller");

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

async function flushAsync() {
  await new Promise((resolve) => setImmediate(resolve));
}

describe("lecturer controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("verifies lecturer course assignment before sending a course message", async () => {
    Message.create.mockResolvedValue({
      _id: "message-1",
      body: "Please review the update.",
    });

    const req = {
      user: { _id: "lecturer-1" },
      body: {
        threadKey: "course-1:general",
        courseId: "course-1",
        recipientIds: ["student-1"],
        body: "Please review the update.",
      },
    };
    const res = createRes();
    const next = jest.fn();

    lecturerController.sendMessage(req, res, next);
    await flushAsync();

    expect(ensureLecturerAssigned).toHaveBeenCalledWith("course-1", "lecturer-1");
    expect(Message.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  it("surfaces assignment errors when lecturer is not allowed to message a course", async () => {
    ensureLecturerAssigned.mockRejectedValueOnce(
      new ApiError(403, "Lecturer is not assigned to this course"),
    );

    const req = {
      user: { _id: "lecturer-1" },
      body: {
        threadKey: "course-2:general",
        courseId: "course-2",
        recipientIds: ["student-1"],
        body: "Unauthorized attempt",
      },
    };
    const res = createRes();
    const next = jest.fn();

    lecturerController.sendMessage(req, res, next);
    await flushAsync();

    expect(Message.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });
});
