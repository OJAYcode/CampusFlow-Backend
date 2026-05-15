jest.mock("axios", () => ({
  get: jest.fn(),
}));

jest.mock("../src/models/courseEnrollment.model");
jest.mock("../src/models/courseMaterial.model");
jest.mock("../src/models/assignment.model");
jest.mock("../src/models/assignmentSubmission.model");
jest.mock("../src/models/assessment.model");
jest.mock("../src/models/assessmentAttempt.model");
jest.mock("../src/models/announcement.model");
jest.mock("../src/models/message.model");
jest.mock("../src/services/access.service", () => ({
  ensureStudentEnrolled: jest.fn().mockResolvedValue(true),
}));
jest.mock("../src/services/enrollment.service", () => ({
  getEligibleElectives: jest.fn().mockResolvedValue([]),
  requestElectives: jest.fn().mockResolvedValue([]),
}));

const axios = require("axios");
const studentController = require("../src/controllers/student.controller");

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

async function flushAsync() {
  await new Promise((resolve) => setImmediate(resolve));
}

describe("student controller online materials search", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reuses cached online material results for repeated titles", async () => {
    axios.get.mockResolvedValue({
      data: {
        docs: [
          {
            key: "/works/OL123W",
            title: "Discrete Mathematics",
            author_name: ["Kenneth Rosen"],
            first_publish_year: 1976,
            edition_count: 3,
            ebook_access: "public",
          },
        ],
      },
    });

    const req = { query: { title: "Discrete Mathematics" } };
    const firstRes = createRes();
    const firstNext = jest.fn();

    studentController.searchOnlineMaterials(req, firstRes, firstNext);
    await flushAsync();

    const secondRes = createRes();
    const secondNext = jest.fn();

    studentController.searchOnlineMaterials(req, secondRes, secondNext);
    await flushAsync();

    expect(axios.get).toHaveBeenCalledTimes(4);
    expect(firstRes.status).toHaveBeenCalledWith(200);
    expect(secondRes.status).toHaveBeenCalledWith(200);
    expect(firstNext).not.toHaveBeenCalled();
    expect(secondNext).not.toHaveBeenCalled();
  });

  it("returns an empty successful response when all providers are rate-limited", async () => {
    axios.get.mockRejectedValue({
      response: {
        status: 429,
      },
    });

    const req = { query: { title: "Operating Systems" } };
    const res = createRes();
    const next = jest.fn();

    studentController.searchOnlineMaterials(req, res, next);
    await flushAsync();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: expect.stringContaining("rate-limited"),
        data: [],
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
