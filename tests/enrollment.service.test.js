const Course = require("../src/models/course.model");
const CourseEnrollment = require("../src/models/courseEnrollment.model");
const User = require("../src/models/user.model");
const { requestElectives } = require("../src/services/enrollment.service");

describe("enrollment service business rules", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("stores only electives allowed for the student's department and level", async () => {
    jest.spyOn(User, "findById").mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: "student-1",
        seededStudent: {
          department: "department-1",
          level: 300,
        },
      }),
    });

    jest.spyOn(Course, "find").mockResolvedValue([
      { _id: { toString: () => "course-allowed" } },
    ]);

    const updateSpy = jest
      .spyOn(CourseEnrollment, "findOneAndUpdate")
      .mockResolvedValue({ _id: "enrollment-1" });

    const result = await requestElectives("student-1", [
      "course-allowed",
      "course-not-allowed",
    ]);

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });
});
