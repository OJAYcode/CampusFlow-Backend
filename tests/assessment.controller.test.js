jest.mock("../src/models/assessment.model");
jest.mock("../src/models/assessmentQuestion.model");
jest.mock("../src/models/assessmentAttempt.model");
jest.mock("../src/services/access.service", () => ({
  ensureStudentEnrolled: jest.fn().mockResolvedValue(true),
}));

const Assessment = require("../src/models/assessment.model");
const AssessmentQuestion = require("../src/models/assessmentQuestion.model");
const AssessmentAttempt = require("../src/models/assessmentAttempt.model");
const { ensureStudentEnrolled } = require("../src/services/access.service");
const ApiError = require("../src/utils/ApiError");
const assessmentController = require("../src/controllers/assessment.controller");

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

async function flushAsync() {
  await new Promise((resolve) => setImmediate(resolve));
}

describe("assessment controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("blocks duplicate starts when multiple attempts are not allowed", async () => {
    Assessment.findById.mockResolvedValue({
      _id: "assessment-1",
      course: "course-1",
      status: "published",
      allowMultipleAttempts: false,
      availableFrom: new Date(Date.now() - 60_000),
      availableTo: new Date(Date.now() + 60_000),
    });
    AssessmentAttempt.findOne.mockResolvedValue({
      _id: "attempt-1",
      status: "submitted",
    });

    const req = {
      params: { id: "assessment-1" },
      user: { _id: "student-1" },
      body: {
        cameraGranted: true,
        microphoneGranted: true,
      },
      get: jest.fn().mockReturnValue("jest-agent"),
      ip: "127.0.0.1",
    };
    const res = createRes();
    const next = jest.fn();

    assessmentController.startAssessment(req, res, next);
    await flushAsync();

    expect(ensureStudentEnrolled).toHaveBeenCalledWith("course-1", "student-1");
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(409);
  });

  it("scores submitted answers against objective questions", async () => {
    const attempt = {
      _id: "attempt-2",
      answers: [],
      score: 0,
      status: "in_progress",
      startedAt: new Date(Date.now() - 60_000),
      submittedAt: null,
      save: jest.fn().mockResolvedValue(true),
    };

    Assessment.findById.mockResolvedValue({
      _id: "assessment-1",
      course: "course-1",
      totalMarks: 10,
      durationMinutes: 30,
      availableTo: new Date(Date.now() + 60_000),
    });
    AssessmentQuestion.find.mockResolvedValue([
      {
        _id: { toString: () => "q1" },
        correctAnswer: "A",
        marks: 2,
      },
      {
        _id: { toString: () => "q2" },
        correctAnswer: "B",
        marks: 3,
      },
    ]);
    AssessmentAttempt.findOne.mockResolvedValue(attempt);

    const req = {
      params: { id: "assessment-1" },
      user: { _id: "student-1" },
      body: {
        answers: [
          { questionId: "q1", answer: "A" },
          { questionId: "q2", answer: "C" },
        ],
      },
    };
    const res = createRes();
    const next = jest.fn();

    assessmentController.submitAssessment(req, res, next);
    await flushAsync();

    expect(attempt.score).toBe(2);
    expect(attempt.status).toBe("submitted");
    expect(attempt.answers).toHaveLength(2);
    expect(attempt.answers[0].isCorrect).toBe(true);
    expect(attempt.answers[1].awardedMarks).toBe(0);
    expect(attempt.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it("caps computed assessment score at the assessment total marks", async () => {
    const attempt = {
      _id: "attempt-4",
      answers: [],
      score: 0,
      status: "in_progress",
      startedAt: new Date(Date.now() - 60_000),
      submittedAt: null,
      save: jest.fn().mockResolvedValue(true),
    };

    Assessment.findById.mockResolvedValue({
      _id: "assessment-5",
      course: "course-1",
      totalMarks: 5,
      durationMinutes: 30,
      availableTo: new Date(Date.now() + 60_000),
    });
    AssessmentQuestion.find.mockResolvedValue([
      {
        _id: { toString: () => "q1" },
        correctAnswer: "A",
        marks: 4,
      },
      {
        _id: { toString: () => "q2" },
        correctAnswer: "B",
        marks: 4,
      },
    ]);
    AssessmentAttempt.findOne.mockResolvedValue(attempt);

    const req = {
      params: { id: "assessment-5" },
      user: { _id: "student-1" },
      body: {
        answers: [
          { questionId: "q1", answer: "A" },
          { questionId: "q2", answer: "B" },
        ],
      },
    };
    const res = createRes();
    const next = jest.fn();

    assessmentController.submitAssessment(req, res, next);
    await flushAsync();

    expect(attempt.score).toBe(5);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it("blocks assessment start before the availability window opens", async () => {
    Assessment.findById.mockResolvedValue({
      _id: "assessment-3",
      course: "course-1",
      status: "published",
      allowMultipleAttempts: false,
      availableFrom: new Date(Date.now() + 10 * 60 * 1000),
      availableTo: new Date(Date.now() + 20 * 60 * 1000),
    });

    const req = {
      params: { id: "assessment-3" },
      user: { _id: "student-1" },
      body: {
        cameraGranted: true,
        microphoneGranted: true,
      },
      get: jest.fn().mockReturnValue("jest-agent"),
      ip: "127.0.0.1",
    };
    const res = createRes();
    const next = jest.fn();

    assessmentController.startAssessment(req, res, next);
    await flushAsync();

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].message).toBe("Assessment is not yet available");
  });

  it("rejects submission when the attempt duration has expired", async () => {
    const expiredAttempt = {
      _id: "attempt-3",
      answers: [],
      score: 0,
      status: "in_progress",
      startedAt: new Date(Date.now() - 31 * 60 * 1000),
      submittedAt: null,
      save: jest.fn().mockResolvedValue(true),
    };

    Assessment.findById.mockResolvedValue({
      _id: "assessment-4",
      course: "course-1",
      durationMinutes: 30,
      availableTo: new Date(Date.now() + 60_000),
    });
    AssessmentQuestion.find.mockResolvedValue([]);
    AssessmentAttempt.findOne.mockResolvedValue(expiredAttempt);

    const req = {
      params: { id: "assessment-4" },
      user: { _id: "student-1" },
      body: { answers: [] },
    };
    const res = createRes();
    const next = jest.fn();

    assessmentController.submitAssessment(req, res, next);
    await flushAsync();

    expect(expiredAttempt.status).toBe("submitted");
    expect(expiredAttempt.submittedAt).toBeTruthy();
    expect(expiredAttempt.save).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].message).toBe("Assessment attempt duration has expired");
  });
});
