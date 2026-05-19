const axios = require("axios");
const CourseEnrollment = require("../models/courseEnrollment.model");
const CourseMaterial = require("../models/courseMaterial.model");
const Assignment = require("../models/assignment.model");
const AssignmentSubmission = require("../models/assignmentSubmission.model");
const Assessment = require("../models/assessment.model");
const AssessmentAttempt = require("../models/assessmentAttempt.model");
const Announcement = require("../models/announcement.model");
const Message = require("../models/message.model");
const Notification = require("../models/notification.model");
const PushSubscription = require("../models/pushSubscription.model");
const apiResponse = require("../utils/apiResponse");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/ApiError");
const { ensureStudentEnrolled } = require("../services/access.service");
const { getEligibleElectives, requestElectives } = require("../services/enrollment.service");
const { notifySubscriptions } = require("../services/pushNotification.service");

const OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json";
const GOOGLE_BOOKS_SEARCH_URL = "https://www.googleapis.com/books/v1/volumes";
const OPENALEX_WORKS_URL = "https://api.openalex.org/works";
const PROJECT_GUTENBERG_SEARCH_URL = "https://www.gutenberg.org/ebooks/search/";
const ONLINE_MATERIAL_CACHE_TTL_MS = 1000 * 60 * 10;
const ONLINE_MATERIAL_CACHE_MAX_ENTRIES = 100;
const onlineMaterialSearchCache = new Map();
const GOOGLE_BOOKS_API_KEY = `${process.env.GOOGLE_BOOKS_API_KEY || ""}`.trim();

function buildOnlineMaterialCacheKey(title) {
  return `${title || ""}`.trim().toLowerCase();
}

function getCachedOnlineMaterialResults(title) {
  const key = buildOnlineMaterialCacheKey(title);
  const cached = onlineMaterialSearchCache.get(key);

  if (!cached) {
    return null;
  }

  if (Date.now() - cached.cachedAt > ONLINE_MATERIAL_CACHE_TTL_MS) {
    onlineMaterialSearchCache.delete(key);
    return null;
  }

  return cached.data;
}

function cacheOnlineMaterialResults(title, data) {
  const key = buildOnlineMaterialCacheKey(title);
  onlineMaterialSearchCache.set(key, {
    data,
    cachedAt: Date.now(),
  });

  if (onlineMaterialSearchCache.size <= ONLINE_MATERIAL_CACHE_MAX_ENTRIES) {
    return;
  }

  const oldestKey = onlineMaterialSearchCache.keys().next().value;
  if (oldestKey) {
    onlineMaterialSearchCache.delete(oldestKey);
  }
}

function buildArchiveReaderUrl(item) {
  const archiveId = Array.isArray(item?.ia) ? `${item.ia[0] || ""}`.trim() : "";
  return archiveId ? `https://archive.org/details/${archiveId}` : null;
}

function buildProjectGutenbergSearchUrl(title) {
  return `${PROJECT_GUTENBERG_SEARCH_URL}?query=${encodeURIComponent(title || "")}`;
}

function decodeHtmlEntities(value) {
  return `${value || ""}`
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function buildOpenLibrarySearchUrl(item) {
  const params = new URLSearchParams();
  const title = `${item?.title || ""}`.trim();
  const firstAuthor = Array.isArray(item?.author_name) ? `${item.author_name[0] || ""}`.trim() : "";

  if (title) {
    params.set("title", title);
  }

  if (firstAuthor) {
    params.set("author", firstAuthor);
  }

  const queryString = params.toString();
  return queryString
    ? `https://openlibrary.org/search?${queryString}`
    : "https://openlibrary.org/search";
}

function normalizeOpenLibraryResult(item) {
  const editionCount = Number(item?.edition_count || 0);
  const archiveReaderUrl = buildArchiveReaderUrl(item);
  const hasDirectAccess = Boolean(item?.public_scan_b || item?.has_fulltext || item?.ebook_access === "public");

  return {
    id: item?.key || archiveReaderUrl || item?.cover_i || item?.title,
    title: item?.title,
    authors: Array.isArray(item?.author_name) ? item.author_name.filter(Boolean).slice(0, 3) : [],
    year: item?.first_publish_year || null,
    source: "Open Library",
    sourceUrl: archiveReaderUrl || buildOpenLibrarySearchUrl(item),
    coverImageUrl: item?.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : null,
    availabilityLabel:
      hasDirectAccess
        ? "Read online for free"
        : editionCount
          ? `${editionCount} edition${editionCount === 1 ? "" : "s"} listed`
          : "Search listing",
  };
}

function normalizeGoogleBooksResult(item) {
  const volumeInfo = item?.volumeInfo || {};
  const accessInfo = item?.accessInfo || {};
  const epubInfo = accessInfo?.epub || {};
  const pdfInfo = accessInfo?.pdf || {};

  const sourceUrl =
    accessInfo?.webReaderLink ||
    volumeInfo?.canonicalVolumeLink ||
    volumeInfo?.infoLink ||
    null;

  if (!item?.id || !volumeInfo?.title || !sourceUrl) {
    return null;
  }

  let availabilityLabel = "Free ebook";
  if (accessInfo?.publicDomain) {
    availabilityLabel = "Public domain";
  } else if (pdfInfo?.isAvailable || epubInfo?.isAvailable) {
    availabilityLabel = "Free download or web reader";
  } else if (accessInfo?.viewability === "ALL_PAGES") {
    availabilityLabel = "Full view online";
  }

  return {
    id: `google-books:${item.id}`,
    title: volumeInfo.title,
    authors: Array.isArray(volumeInfo.authors) ? volumeInfo.authors.filter(Boolean).slice(0, 3) : [],
    year: volumeInfo.publishedDate ? Number.parseInt(`${volumeInfo.publishedDate}`.slice(0, 4), 10) || null : null,
    source: "Google Books",
    sourceUrl,
    coverImageUrl: volumeInfo?.imageLinks?.thumbnail || volumeInfo?.imageLinks?.smallThumbnail || null,
    availabilityLabel,
  };
}

function normalizeOpenAlexResult(item) {
  const bestLocation = item?.best_oa_location || item?.primary_location || null;
  const pdfUrl = bestLocation?.pdf_url || item?.open_access?.oa_url || null;
  const landingPageUrl = bestLocation?.landing_page_url || item?.ids?.doi || item?.doi || null;
  const sourceUrl = pdfUrl || landingPageUrl;

  if (!item?.id || !item?.display_name || !sourceUrl) {
    return null;
  }

  return {
    id: `openalex:${item.id}`,
    title: item.display_name,
    authors: Array.isArray(item?.authorships)
      ? item.authorships
        .map((authorship) => authorship?.author?.display_name)
        .filter(Boolean)
        .slice(0, 3)
      : [],
    year: item?.publication_year || null,
    source: "OpenAlex",
    sourceUrl,
    coverImageUrl: null,
    availabilityLabel: pdfUrl ? "Open-access PDF available" : "Open-access full text available",
  };
}

function normalizeProjectGutenbergResult(match) {
  const href = decodeHtmlEntities(match?.href);
  const title = decodeHtmlEntities(match?.title);
  const subtitle = decodeHtmlEntities(match?.subtitle);
  const coverPath = decodeHtmlEntities(match?.coverPath);

  if (!href || !title) {
    return null;
  }

  return {
    id: `project-gutenberg:${href}`,
    title,
    authors: subtitle ? subtitle.split(/\s+and\s+|,\s*/).filter(Boolean).slice(0, 3) : [],
    year: null,
    source: "Project Gutenberg",
    sourceUrl: `https://www.gutenberg.org${href}`,
    coverImageUrl: coverPath ? `https://www.gutenberg.org${coverPath}` : null,
    availabilityLabel: "Read online or download free public-domain ebook",
  };
}

function dedupeOnlineMaterialResults(results) {
  const seen = new Set();

  return results.filter((item) => {
    const key = `${item.title || ""}|${(item.authors || []).join("|")}`.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function isRateLimitError(error) {
  return error?.response?.status === 429;
}

async function searchOpenLibraryMaterials(title) {
  const response = await axios.get(OPEN_LIBRARY_SEARCH_URL, {
    params: {
      title,
      limit: 8,
      fields: "key,title,author_name,first_publish_year,cover_i,ebook_access,edition_count,ia,has_fulltext,public_scan_b",
    },
    timeout: 8000,
    headers: {
      "User-Agent": "CampusFlow/1.0",
    },
  });

  return Array.isArray(response.data?.docs)
    ? response.data.docs
      .map(normalizeOpenLibraryResult)
      .filter((item) => item.id && item.title && item.sourceUrl)
    : [];
}

async function searchGoogleBooksMaterials(title) {
  const params = {
    q: `intitle:${title}`,
    filter: "free-ebooks",
    printType: "books",
    maxResults: 8,
    projection: "lite",
    orderBy: "relevance",
  };

  if (GOOGLE_BOOKS_API_KEY) {
    params.key = GOOGLE_BOOKS_API_KEY;
  }

  const response = await axios.get(GOOGLE_BOOKS_SEARCH_URL, {
    params,
    timeout: 8000,
    headers: {
      "User-Agent": "CampusFlow/1.0",
    },
  });

  return Array.isArray(response.data?.items)
    ? response.data.items
      .map(normalizeGoogleBooksResult)
      .filter(Boolean)
    : [];
}

async function searchOpenAlexMaterials(title) {
  const response = await axios.get(OPENALEX_WORKS_URL, {
    params: {
      search: title,
      filter: "is_oa:true,has_fulltext:true,type:article|book|book-chapter|dissertation",
      per_page: 6,
      select:
        "id,display_name,publication_year,authorships,best_oa_location,primary_location,open_access,doi,ids",
      sort: "relevance_score:desc",
    },
    timeout: 8000,
    headers: {
      "User-Agent": "CampusFlow/1.0",
    },
  });

  return Array.isArray(response.data?.results)
    ? response.data.results
      .map(normalizeOpenAlexResult)
      .filter(Boolean)
    : [];
}

async function searchProjectGutenbergMaterials(title) {
  const response = await axios.get(buildProjectGutenbergSearchUrl(title), {
    timeout: 8000,
    headers: {
      "User-Agent": "CampusFlow/1.0",
    },
  });

  const html = `${response.data || ""}`;
  if (!html || html.includes('<span class="title">No records found.</span>')) {
    return [];
  }

  const matches = Array.from(
    html.matchAll(
      /<li class="booklink">[\s\S]*?<a class="link" href="(?<href>[^"]+)"[\s\S]*?(?:<img class="cover-thumb" src="(?<coverPath>[^"]+)".*?>)?[\s\S]*?<span class="title">(?<title>[\s\S]*?)<\/span>[\s\S]*?(?:<span class="subtitle">(?<subtitle>[\s\S]*?)<\/span>)?[\s\S]*?<\/a>[\s\S]*?<\/li>/g,
    ),
  );

  return matches
    .map((match) => normalizeProjectGutenbergResult(match.groups || {}))
    .filter(Boolean)
    .slice(0, 6);
}

exports.profile = catchAsync(async (req, res) => {
  const student =
    typeof req.user?.populate === "function"
      ? await req.user.populate("faculty department")
      : req.user;
  return apiResponse(res, { message: "Student profile fetched", data: student });
});

exports.updateProfile = catchAsync(async (req, res) => {
  if (typeof req.body.fullName !== "undefined") {
    req.user.fullName = req.body.fullName.trim();
  }

  if (typeof req.body.email !== "undefined") {
    req.user.email = req.body.email.trim().toLowerCase();
  }

  if (typeof req.body.phone !== "undefined") {
    req.user.phone = `${req.body.phone || ""}`.trim();
  }

  await req.user.save();
  const student =
    typeof req.user?.populate === "function"
      ? await req.user.populate("faculty department")
      : req.user;

  return apiResponse(res, { message: "Student profile updated", data: student });
});

exports.getElectives = catchAsync(async (req, res) => {
  const electives = await getEligibleElectives(req.user._id);
  return apiResponse(res, { message: "Eligible electives fetched", data: electives });
});

exports.selectElectives = catchAsync(async (req, res) => {
  const selections = await requestElectives(req.user._id, req.body.courseIds);
  return apiResponse(res, { statusCode: 201, message: "Elective requests submitted", data: selections });
});

exports.getEnrollments = catchAsync(async (req, res) => {
  const enrollments = await CourseEnrollment.find({ student: req.user._id })
    .populate("course")
    .sort({ createdAt: -1 });

  return apiResponse(res, { message: "Student enrollments fetched", data: enrollments });
});

exports.getMaterials = catchAsync(async (req, res) => {
  const enrollments = await CourseEnrollment.find({
    student: req.user._id,
    approvalStatus: "approved",
  }).select("course");

  const courseIds = enrollments.map((item) => item.course);
  const materials = await CourseMaterial.find({ course: { $in: courseIds } }).populate("course");
  return apiResponse(res, { message: "Course materials fetched", data: materials });
});

exports.searchOnlineMaterials = catchAsync(async (req, res) => {
  const title = `${req.query.title || ""}`.trim();

  if (title.length < 2) {
    return apiResponse(res, {
      message: "Enter at least two characters to search online references",
      data: [],
    });
  }

  const cachedResults = getCachedOnlineMaterialResults(title);
  if (cachedResults) {
    return apiResponse(res, { message: "Online references fetched", data: cachedResults });
  }

  try {
    const sources = await Promise.allSettled([
      searchOpenLibraryMaterials(title),
      searchGoogleBooksMaterials(title),
      searchOpenAlexMaterials(title),
      searchProjectGutenbergMaterials(title),
    ]);

    const openLibraryResults = sources[0].status === "fulfilled" ? sources[0].value : [];
    const googleBooksResults = sources[1].status === "fulfilled" ? sources[1].value : [];
    const openAlexResults = sources[2].status === "fulfilled" ? sources[2].value : [];
    const projectGutenbergResults = sources[3].status === "fulfilled" ? sources[3].value : [];
    const results = dedupeOnlineMaterialResults([
      ...openAlexResults,
      ...openLibraryResults,
      ...googleBooksResults,
      ...projectGutenbergResults,
    ]).slice(0, 12);

    if (!results.length) {
      const sourceErrors = sources
        .filter((source) => source.status === "rejected")
        .map((source) => source.reason);

      if (sourceErrors.length && sourceErrors.every(isRateLimitError)) {
        return apiResponse(res, {
          message: "Online references are temporarily rate-limited. Please wait a moment and try again.",
          data: [],
        });
      }
    }

    cacheOnlineMaterialResults(title, results);

    return apiResponse(res, { message: "Online references fetched", data: results });
  } catch (error) {
    if (isRateLimitError(error)) {
      return apiResponse(res, {
        message: "Online references are temporarily rate-limited. Please wait a moment and try again.",
        data: [],
      });
    }

    throw new ApiError(502, "Online reference search is unavailable right now");
  }
});

exports.getAssignments = catchAsync(async (req, res) => {
  const enrollments = await CourseEnrollment.find({
    student: req.user._id,
    approvalStatus: "approved",
  }).select("course");
  const courseIds = enrollments.map((item) => item.course);
  await Assignment.updateMany(
    {
      course: { $in: courseIds },
      status: "closed",
      dueDate: { $gt: new Date() },
    },
    { status: "published" },
  );
  const assignments = await Assignment.find({ course: { $in: courseIds }, status: { $ne: "draft" } }).populate("course");
  const submissions = await AssignmentSubmission.find({
    course: { $in: courseIds },
    student: req.user._id,
  }).select("assignment submittedAt status grade feedback");
  const submissionMap = new Map(
    submissions.map((submission) => [String(submission.assignment), submission]),
  );

  const enrichedAssignments = assignments.map((assignment) => ({
    ...assignment.toObject(),
    submission: submissionMap.get(String(assignment._id)) || null,
  }));
  return apiResponse(res, { message: "Assignments fetched", data: enrichedAssignments });
});

exports.submitAssignment = catchAsync(async (req, res) => {
  const assignment = await Assignment.findById(req.params.assignmentId);
  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }
  const status = new Date() > assignment.dueDate ? "late" : "submitted";

  const submission = await AssignmentSubmission.findOneAndUpdate(
    { assignment: assignment._id, student: req.user._id },
    {
      assignment: assignment._id,
      student: req.user._id,
      course: assignment.course,
      submissionText: req.body.submissionText,
      attachmentUrls: req.body.attachmentUrls || [],
      status,
      submittedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return apiResponse(res, { statusCode: 201, message: "Assignment submitted", data: submission });
});

exports.getAssessments = catchAsync(async (req, res) => {
  const enrollments = await CourseEnrollment.find({
    student: req.user._id,
    approvalStatus: "approved",
  }).select("course");
  const courseIds = enrollments.map((item) => item.course);
  await Assessment.updateMany(
    {
      course: { $in: courseIds },
      status: "closed",
      availableTo: { $gt: new Date() },
    },
    { status: "published" },
  );
  const assessments = await Assessment.find({ course: { $in: courseIds }, status: "published" }).populate("course");
  return apiResponse(res, { message: "Assessments fetched", data: assessments });
});

exports.getAssessmentAttempts = catchAsync(async (req, res) => {
  const attempts = await AssessmentAttempt.find({ student: req.user._id }).populate("assessment");
  return apiResponse(res, { message: "Assessment attempts fetched", data: attempts });
});

exports.getAnnouncements = catchAsync(async (req, res) => {
  const enrollments = await CourseEnrollment.find({ student: req.user._id, approvalStatus: "approved" }).select("course");
  const courseIds = enrollments.map((item) => item.course);
  const announcements = await Announcement.find({ course: { $in: courseIds } }).populate("course sender", "title code fullName");
  return apiResponse(res, { message: "Announcements fetched", data: announcements });
});

exports.getMessages = catchAsync(async (req, res) => {
  const messages = await Message.find({
    $or: [{ sender: req.user._id }, { recipients: req.user._id }],
  }).sort({ createdAt: -1 });

  return apiResponse(res, { message: "Messages fetched", data: messages });
});

exports.sendMessage = catchAsync(async (req, res) => {
  if (req.body.courseId) {
    await ensureStudentEnrolled(req.body.courseId, req.user._id);
  }

  const recipientIds = Array.from(new Set((req.body.recipientIds || []).filter(Boolean)));

  const message = await Message.create({
    threadKey: req.body.threadKey,
    course: req.body.courseId,
    sender: req.user._id,
    recipients: recipientIds,
    body: req.body.body,
    attachmentUrls: req.body.attachmentUrls || [],
  });

  if (recipientIds.length) {
    const notificationTitle = `New message from ${req.user.fullName || "Student"}`;
    const notificationBody = req.body.body?.length > 140 ? `${req.body.body.slice(0, 137)}...` : req.body.body;

    await Notification.insertMany(
      recipientIds.map((recipientId) => ({
        user: recipientId,
        title: notificationTitle,
        body: notificationBody,
        type: "message",
        metadata: {
          messageId: message._id,
          threadKey: req.body.threadKey,
          courseId: req.body.courseId || null,
          url: "/staff/lecturer/messages",
        },
      })),
      { ordered: false },
    ).catch(() => undefined);

    const subscriptions = await PushSubscription.find({
      user: { $in: recipientIds },
      portal: "staff",
    });

    await notifySubscriptions(subscriptions, {
      title: notificationTitle,
      body: notificationBody,
      data: {
        url: "/staff/lecturer/messages",
        messageId: String(message._id),
        threadKey: req.body.threadKey,
        courseId: req.body.courseId ? String(req.body.courseId) : undefined,
      },
    });
  }

  return apiResponse(res, { statusCode: 201, message: "Message sent", data: message });
});
