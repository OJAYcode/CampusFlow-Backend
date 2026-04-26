jest.mock("../src/services/access.service", () => ({
  ensureStudentEnrolled: jest.fn().mockResolvedValue(true),
  ensureLecturerAssigned: jest.fn().mockResolvedValue(true),
}));

const AttendanceSession = require("../src/models/attendanceSession.model");
const AttendanceRecord = require("../src/models/attendanceRecord.model");
const DeviceFingerprint = require("../src/models/deviceFingerprint.model");
const { submitAttendance } = require("../src/services/attendance.service");

describe("attendance anti-fraud rules", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("rejects device reuse for another student in the same session", async () => {
    jest.spyOn(AttendanceSession, "findOne").mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: "session-1",
        course: { _id: "course-1" },
        latitude: 6.5,
        longitude: 3.3,
        radius: 100,
        faceVerificationEnabled: false,
      }),
    });

    jest
      .spyOn(AttendanceRecord, "findOne")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: "record-1" });

    await expect(
      submitAttendance(
        { _id: "student-1" },
        {
          sessionId: "session-1",
          sessionCode: "123456",
          latitude: 6.5,
          longitude: 3.3,
          deviceFingerprint: "device-1",
        },
        { ip: "127.0.0.1", userAgent: "jest" },
      ),
    ).rejects.toThrow("This device has already been used by another student in this session");
  });

  it("stores attendance when validation passes", async () => {
    jest.spyOn(AttendanceSession, "findOne").mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: "session-1",
        course: { _id: "course-1" },
        latitude: 6.5,
        longitude: 3.3,
        radius: 150,
        faceVerificationEnabled: false,
      }),
    });
    jest
      .spyOn(AttendanceRecord, "findOne")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    jest.spyOn(AttendanceRecord, "create").mockResolvedValue({ _id: "record-1" });
    jest.spyOn(DeviceFingerprint, "findOneAndUpdate").mockResolvedValue({});

    const result = await submitAttendance(
      { _id: "student-1" },
      {
        sessionId: "session-1",
        sessionCode: "123456",
        latitude: 6.5,
        longitude: 3.3,
        deviceFingerprint: "device-1",
      },
      { ip: "127.0.0.1", userAgent: "jest" },
    );

    expect(result._id).toBe("record-1");
  });
});
