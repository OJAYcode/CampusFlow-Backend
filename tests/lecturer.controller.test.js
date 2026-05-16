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
const Assignment = require("../src/models/assignment.model");
const AssignmentSubmission = require("../src/models/assignmentSubmission.model");
const Assessment = require("../src/models/assessment.model");
const AssessmentQuestion = require("../src/models/assessmentQuestion.model");
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

  it("rejects assignment grades above the assignment total marks", async () => {
    AssignmentSubmission.findById.mockResolvedValue({
      _id: "submission-1",
      assignment: "assignment-1",
      course: "course-1",
    });
    Assignment.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: "assignment-1",
        totalMarks: 20,
      }),
    });

    const req = {
      params: { submissionId: "submission-1" },
      user: { _id: "lecturer-1" },
      body: { grade: 25, feedback: "Too high" },
    };
    const res = createRes();
    const next = jest.fn();

    lecturerController.gradeSubmission(req, res, next);
    await flushAsync();

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].message).toContain("cannot be greater");
  });

  it("rejects assessment creation when question marks exceed overall marks", async () => {
    Assessment.create.mockResolvedValue({ _id: "assessment-1" });

    const req = {
      user: { _id: "lecturer-1" },
      body: {
        courseId: "course-1",
        title: "Midterm",
        assessmentType: "test",
        totalMarks: 10,
        durationMinutes: 30,
        availableFrom: new Date().toISOString(),
        availableTo: new Date(Date.now() + 3600000).toISOString(),
        questions: [
          { questionText: "Q1", marks: 6 },
          { questionText: "Q2", marks: 7 },
        ],
      },
    };
    const res = createRes();
    const next = jest.fn();

    lecturerController.createAssessment(req, res, next);
    await flushAsync();

    expect(Assessment.create).not.toHaveBeenCalled();
    expect(AssessmentQuestion.insertMany).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].message).toContain("cannot exceed");
  });
});
