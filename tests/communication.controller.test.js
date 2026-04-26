jest.mock("../src/models/announcement.model");
jest.mock("../src/models/message.model");

const Message = require("../src/models/message.model");
const ApiError = require("../src/utils/ApiError");
const communicationController = require("../src/controllers/communication.controller");

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

async function flushAsync() {
  await new Promise((resolve) => setImmediate(resolve));
}

function createFindChain(result) {
  return {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockResolvedValue(result),
  };
}

describe("communication controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns thread summaries with unread counts", async () => {
    const currentUserId = "student-1";
    const messages = [
      {
        threadKey: "course-1:general",
        course: { _id: "course-1", title: "Software Engineering" },
        sender: { toString: () => "lecturer-1" },
        recipients: [{ toString: () => currentUserId }],
        createdAt: new Date("2026-04-03T10:00:00.000Z"),
        readBy: [],
      },
      {
        threadKey: "course-1:general",
        course: { _id: "course-1", title: "Software Engineering" },
        sender: { toString: () => currentUserId },
        recipients: [{ toString: () => "lecturer-1" }],
        createdAt: new Date("2026-04-03T09:00:00.000Z"),
        readBy: [],
      },
    ];
    Message.find.mockReturnValue(createFindChain(messages));

    const req = { user: { _id: currentUserId }, query: {} };
    const res = createRes();
    const next = jest.fn();

    communicationController.listMessages(req, res, next);
    await flushAsync();

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.message).toBe("Message threads fetched");
    expect(payload.data.items).toHaveLength(1);
    expect(payload.data.total).toBe(1);
    expect(payload.data.items[0].unreadCount).toBe(1);
    expect(payload.data.items[0].threadKey).toBe("course-1:general");
  });

  it("returns the messages inside a specific thread", async () => {
    const threadMessages = [
      { _id: "message-1", threadKey: "thread-1" },
      { _id: "message-2", threadKey: "thread-1" },
    ];
    Message.find.mockReturnValue(createFindChain(threadMessages));

    const req = {
      user: { _id: "student-1" },
      params: { threadKey: "thread-1" },
      query: {},
    };
    const res = createRes();
    const next = jest.fn();

    communicationController.getThreadMessages(req, res, next);
    await flushAsync();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].data.items).toHaveLength(2);
    expect(next).not.toHaveBeenCalled();
  });

  it("marks unread recipient messages in a thread as read", async () => {
    const save = jest.fn().mockResolvedValue(true);
    const messages = [
      {
        threadKey: "thread-2",
        readBy: [],
        save,
      },
    ];
    Message.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue(messages),
    });

    const req = {
      user: { _id: "student-1" },
      params: { threadKey: "thread-2" },
      query: {},
    };
    const res = createRes();
    const next = jest.fn();

    communicationController.markThreadAsRead(req, res, next);
    await flushAsync();

    expect(messages[0].readBy).toHaveLength(1);
    expect(save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].data.updatedCount).toBe(1);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns not found when trying to read a thread with no accessible messages", async () => {
    Message.find.mockReturnValue(createFindChain([]));

    const req = {
      user: { _id: "student-1" },
      params: { threadKey: "missing-thread" },
      query: {},
    };
    const res = createRes();
    const next = jest.fn();

    communicationController.getThreadMessages(req, res, next);
    await flushAsync();

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next.mock.calls[0][0].statusCode).toBe(404);
  });
});
