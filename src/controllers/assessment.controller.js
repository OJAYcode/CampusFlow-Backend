const Assessment = require("../models/assessment.model");
const AssessmentQuestion = require("../models/assessmentQuestion.model");
const AssessmentAttempt = require("../models/assessmentAttempt.model");
const apiResponse = require("../utils/apiResponse");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/ApiError");
const { ensureStudentEnrolled } = require("../services/access.service");

function getPenaltyDurationMs(assessment) {
  return Math.max(60_000, Math.floor((assessment.durationMinutes * 60 * 1000) / 2));
}

function syncAttemptClock(attempt, assessment, now = new Date()) {
  if (!attempt || attempt.status !== "in_progress") {
    return { remainingTimeMs: attempt?.remainingTimeMs || 0, penaltyActive: false, changed: false };
  }

  const nowMs = now.getTime();
  const penaltyLockUntilMs = attempt.proctoring?.penaltyLockUntil
    ? new Date(attempt.proctoring.penaltyLockUntil).getTime()
    : null;

  let changed = false;
  let remainingTimeMs =
    typeof attempt.remainingTimeMs === "number" && attempt.remainingTimeMs > 0
      ? attempt.remainingTimeMs
      : assessment.durationMinutes * 60 * 1000;

  if (!attempt.remainingTimeMs) {
    attempt.remainingTimeMs = remainingTimeMs;
    changed = true;
  }

  if (penaltyLockUntilMs && penaltyLockUntilMs > nowMs) {
    if (attempt.lastResumedAt) {
      const elapsedSinceResume = Math.max(0, nowMs - new Date(attempt.lastResumedAt).getTime());
      const nextRemaining = Math.max(0, remainingTimeMs - elapsedSinceResume);
      if (nextRemaining !== remainingTimeMs) {
        remainingTimeMs = nextRemaining;
        attempt.remainingTimeMs = nextRemaining;
        changed = true;
      }
      attempt.lastResumedAt = null;
      changed = true;
    }

    return { remainingTimeMs, penaltyActive: true, changed };
  }

  if (penaltyLockUntilMs && penaltyLockUntilMs <= nowMs) {
    const resumeAt = new Date(penaltyLockUntilMs);
    if (!attempt.lastResumedAt) {
      attempt.lastResumedAt = resumeAt;
      changed = true;
    }
    attempt.proctoring.penaltyLockUntil = undefined;
    changed = true;
  }

  const anchorMs = attempt.lastResumedAt
    ? new Date(attempt.lastResumedAt).getTime()
    : new Date(attempt.startedAt || now).getTime();
  const elapsedSinceAnchor = Math.max(0, nowMs - anchorMs);
  const nextRemaining = Math.max(0, remainingTimeMs - elapsedSinceAnchor);

  if (nextRemaining !== remainingTimeMs) {
    remainingTimeMs = nextRemaining;
    attempt.remainingTimeMs = nextRemaining;
    changed = true;
  }

  attempt.lastResumedAt = now;
  changed = true;

  return { remainingTimeMs, penaltyActive: false, changed };
}

exports.getAssessment = catchAsync(async (req, res) => {
  const assessment = await Assessment.findById(req.params.id).populate("course lecturer", "title code fullName");
  if (!assessment) {
    throw new ApiError(404, "Assessment not found");
  }

  let attempt = null;
  let questions = [];

  if (req.user.role === "student") {
    await ensureStudentEnrolled(assessment.course, req.user._id);
    attempt = await AssessmentAttempt.findOne({
      assessment: assessment._id,
      student: req.user._id,
      status: { $in: ["in_progress", "submitted", "graded"] },
    }).sort({ createdAt: -1 });

    if (attempt) {
      const { changed } = syncAttemptClock(attempt, assessment);
      if (changed) {
        await attempt.save();
      }
      questions = await AssessmentQuestion.find({ assessment: req.params.id }).sort({ order: 1 });
    }
  } else {
    questions = await AssessmentQuestion.find({ assessment: req.params.id }).sort({ order: 1 });
  }

  return apiResponse(res, { message: "Assessment fetched", data: { assessment, questions, attempt } });
});

exports.startAssessment = catchAsync(async (req, res) => {
  const assessment = await Assessment.findById(req.params.id);
  if (!assessment || assessment.status !== "published") {
    throw new ApiError(404, "Assessment is unavailable");
  }

  const now = new Date();
  if (assessment.availableFrom && now < assessment.availableFrom) {
    throw new ApiError(400, "Assessment is not yet available");
  }
  if (assessment.availableTo && now > assessment.availableTo) {
    throw new ApiError(400, "Assessment availability window has closed");
  }

  if (!req.body.cameraGranted || !req.body.microphoneGranted) {
    throw new ApiError(400, "Camera and microphone access are required before starting this assessment");
  }

  await ensureStudentEnrolled(assessment.course, req.user._id);

  if (!assessment.allowMultipleAttempts) {
    const existing = await AssessmentAttempt.findOne({
      assessment: assessment._id,
      student: req.user._id,
      status: { $in: ["in_progress", "submitted", "graded"] },
    });

    if (existing) {
      throw new ApiError(409, "This assessment only allows one attempt");
    }
  }

  const attempt = await AssessmentAttempt.create({
    assessment: assessment._id,
    student: req.user._id,
    remainingTimeMs: assessment.durationMinutes * 60 * 1000,
    lastResumedAt: now,
    deviceMetadata: {
      userAgent: req.get("User-Agent"),
    },
    ipAddress: req.ip,
    proctoring: {
      cameraGranted: Boolean(req.body.cameraGranted),
      microphoneGranted: Boolean(req.body.microphoneGranted),
      tabSwitchCount: 0,
      windowBlurCount: 0,
      penaltyCount: 0,
      totalPenaltyMs: 0,
      micLevel: 0,
      updatedAt: now,
    },
  });

  return apiResponse(res, { statusCode: 201, message: "Assessment attempt started", data: attempt });
});

exports.updateProctoring = catchAsync(async (req, res) => {
  const assessment = await Assessment.findById(req.params.id).select("durationMinutes");
  if (!assessment) {
    throw new ApiError(404, "Assessment not found");
  }

  const attempt = await AssessmentAttempt.findOne({
    assessment: req.params.id,
    student: req.user._id,
    status: "in_progress",
  });

  if (!attempt) {
    throw new ApiError(404, "Active assessment attempt was not found");
  }

  const syncState = syncAttemptClock(attempt, assessment, new Date());
  const previousTabSwitchCount = attempt.proctoring?.tabSwitchCount || 0;
  const nextTabSwitchCount =
    typeof req.body.tabSwitchCount === "number"
      ? req.body.tabSwitchCount
      : previousTabSwitchCount;
  const newTabSwitches = Math.max(0, nextTabSwitchCount - previousTabSwitchCount);

  attempt.proctoring = {
    ...(attempt.proctoring || {}),
    cameraGranted:
      typeof req.body.cameraGranted === "boolean"
        ? req.body.cameraGranted
        : attempt.proctoring?.cameraGranted || false,
    microphoneGranted:
      typeof req.body.microphoneGranted === "boolean"
        ? req.body.microphoneGranted
        : attempt.proctoring?.microphoneGranted || false,
    tabSwitchCount: nextTabSwitchCount,
    windowBlurCount:
      typeof req.body.windowBlurCount === "number"
        ? req.body.windowBlurCount
        : attempt.proctoring?.windowBlurCount || 0,
    penaltyLockUntil: attempt.proctoring?.penaltyLockUntil,
    penaltyCount: attempt.proctoring?.penaltyCount || 0,
    totalPenaltyMs: attempt.proctoring?.totalPenaltyMs || 0,
    lastVisibilityChangeAt: req.body.lastVisibilityChangeAt || attempt.proctoring?.lastVisibilityChangeAt,
    latestSnapshotDataUrl: req.body.latestSnapshotDataUrl || attempt.proctoring?.latestSnapshotDataUrl,
    micLevel:
      typeof req.body.micLevel === "number"
        ? req.body.micLevel
        : attempt.proctoring?.micLevel || 0,
    updatedAt: new Date(),
  };

  if (syncState.remainingTimeMs <= 0) {
    attempt.status = "submitted";
    attempt.submittedAt = new Date();
    await attempt.save();
    throw new ApiError(400, "Assessment attempt duration has expired");
  }

  if (newTabSwitches > 0) {
    const penaltyDurationMs = getPenaltyDurationMs(assessment);
    const now = new Date();
    const baseLockUntil =
      attempt.proctoring?.penaltyLockUntil && new Date(attempt.proctoring.penaltyLockUntil) > now
        ? new Date(attempt.proctoring.penaltyLockUntil)
        : now;

    attempt.proctoring.penaltyLockUntil = new Date(
      baseLockUntil.getTime() + penaltyDurationMs * newTabSwitches,
    );
    attempt.proctoring.penaltyCount = (attempt.proctoring.penaltyCount || 0) + newTabSwitches;
    attempt.proctoring.totalPenaltyMs =
      (attempt.proctoring.totalPenaltyMs || 0) + penaltyDurationMs * newTabSwitches;
    attempt.lastResumedAt = null;
  }

  await attempt.save();

  return apiResponse(res, { message: "Assessment proctoring updated", data: attempt });
});

exports.submitAssessment = catchAsync(async (req, res) => {
  const assessment = await Assessment.findById(req.params.id);
  if (!assessment) {
    throw new ApiError(404, "Assessment not found");
  }
  const now = new Date();
  if (assessment.availableTo && now > assessment.availableTo) {
    throw new ApiError(400, "Assessment availability window has closed");
  }
  const questions = await AssessmentQuestion.find({ assessment: assessment._id });
  const attempt = await AssessmentAttempt.findOne({
    assessment: assessment._id,
    student: req.user._id,
    status: "in_progress",
  });

  if (!attempt) {
    throw new ApiError(404, "Active assessment attempt was not found");
  }

  const { remainingTimeMs, penaltyActive, changed } = syncAttemptClock(attempt, assessment, now);
  if (changed) {
    await attempt.save();
  }

  if (penaltyActive) {
    throw new ApiError(
      423,
      "This assessment is temporarily locked because you left the test tab. Wait for the lock period to finish, then continue.",
    );
  }

  if (remainingTimeMs <= 0) {
    attempt.status = "submitted";
    attempt.submittedAt = now;
    await attempt.save();
    throw new ApiError(400, "Assessment attempt duration has expired");
  }

  const answers = [];
  let score = 0;

  for (const question of questions) {
    const submittedAnswer = req.body.answers?.find(
      (item) => item.questionId === question._id.toString(),
    );

    const isCorrect = submittedAnswer
      ? String(submittedAnswer.answer) === String(question.correctAnswer)
      : false;
    const awardedMarks = isCorrect ? question.marks : 0;

    score += awardedMarks;
    answers.push({
      question: question._id,
      answer: submittedAnswer ? submittedAnswer.answer : null,
      isCorrect,
      awardedMarks,
    });
  }

  attempt.answers = answers;
  attempt.score = score;
  attempt.status = "submitted";
  attempt.submittedAt = now;
  await attempt.save();

  return apiResponse(res, { message: "Assessment submitted", data: attempt });
});

exports.getAssessmentAttempts = catchAsync(async (req, res) => {
  const attempts = await AssessmentAttempt.find({ assessment: req.params.id }).populate(
    "student",
    "fullName matricNumber",
  );

  return apiResponse(res, { message: "Assessment attempts fetched", data: attempts });
});
