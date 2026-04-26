const COURSE_TYPES = {
  CORE: "core",
  ELECTIVE: "elective",
};

const ENROLLMENT_TYPES = {
  AUTO: "auto",
  SELECTED: "selected",
};

const ENROLLMENT_APPROVAL_STATUS = {
  APPROVED: "approved",
  PENDING: "pending",
  REJECTED: "rejected",
};

const ATTENDANCE_STATUS = {
  PRESENT: "present",
  REJECTED: "rejected",
  FLAGGED: "flagged",
};

const ASSIGNMENT_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  CLOSED: "closed",
};

const SUBMISSION_STATUS = {
  SUBMITTED: "submitted",
  LATE: "late",
  GRADED: "graded",
};

const ASSESSMENT_TYPES = {
  QUIZ: "quiz",
  TEST: "test",
  EXAM: "exam",
};

const ASSESSMENT_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  CLOSED: "closed",
};

module.exports = {
  COURSE_TYPES,
  ENROLLMENT_TYPES,
  ENROLLMENT_APPROVAL_STATUS,
  ATTENDANCE_STATUS,
  ASSIGNMENT_STATUS,
  SUBMISSION_STATUS,
  ASSESSMENT_TYPES,
  ASSESSMENT_STATUS,
};
