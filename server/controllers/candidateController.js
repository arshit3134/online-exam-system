const Exam = require('../models/Exam');
const Attempt = require('../models/ExamAttempt');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, buildMeta, escapeRegex } = require('../utils/pagination');
const { availabilityOf, round2 } = require('../services/examService');
const svc = require('../services/attemptService');

const examCard = (exam, myAttempts, now = new Date()) => {
  const mine = myAttempts.filter((a) => String(a.examId) === String(exam._id));
  const submitted = mine.filter((a) => a.status === 'submitted');
  const inProgress = mine.find((a) => a.status === 'in_progress' && a.expiresAt > now);
  const window = availabilityOf(exam, now);
  const max = svc.maxAttemptsOf(exam);
  let status = window; // open | upcoming | ended
  if (inProgress) status = 'in_progress';
  else if (submitted.length >= max) status = 'completed';
  return {
    _id: String(exam._id),
    title: exam.title,
    description: exam.description,
    subject: exam.subject,
    duration: exam.duration,
    totalMarks: exam.totalMarks,
    passingPercentage: exam.passingPercentage,
    questionCount: exam.questions.length,
    availability: exam.availability,
    window,
    status,
    canStart: ['open', 'in_progress'].includes(status),
    attemptsUsed: submitted.length,
    maxAttempts: max,
    inProgressAttemptId: inProgress ? String(inProgress._id) : null,
  };
};

const loadPublishedExam = async (id) => {
  const exam = await Exam.findOne({ _id: id, status: 'published' });
  if (!exam) throw new ApiError(404, 'Exam not found');
  return exam;
};

const ownAttempt = async (id, userId) => {
  const attempt = await Attempt.findOne({ _id: id, candidateId: userId });
  if (!attempt) throw new ApiError(404, 'Attempt not found');
  return attempt;
};

// ---------- exams ----------
exports.listExams = asyncHandler(async (req, res) => {
  const p = parsePagination(req.query, { defaultLimit: 9 });
  const filter = { status: 'published', 'questions.0': { $exists: true } };
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ title: rx }, { subject: rx }];
  }
  const [total, exams] = await Promise.all([
    Exam.countDocuments(filter),
    Exam.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit),
  ]);
  const mine = await Attempt.find({ candidateId: req.user._id, examId: { $in: exams.map((e) => e._id) } })
    .select('examId status expiresAt')
    .lean();
  res.json({ data: exams.map((e) => examCard(e, mine)), meta: buildMeta(p, total) });
});

exports.getExam = asyncHandler(async (req, res) => {
  const exam = await loadPublishedExam(req.params.id);
  const mine = await Attempt.find({ candidateId: req.user._id, examId: exam._id }).select('examId status expiresAt').lean();
  res.json({ data: { exam: examCard(exam, mine) } });
});

exports.startExam = asyncHandler(async (req, res) => {
  const exam = await loadPublishedExam(req.params.id);
  const attempt = await svc.startAttempt(exam, req.user);
  res.status(201).json({ data: svc.attemptPayload(attempt, exam) });
});

// ---------- attempts ----------
exports.getAttempt = asyncHandler(async (req, res) => {
  let attempt = await ownAttempt(req.params.id, req.user._id);
  attempt = await svc.ensureCurrent(attempt);
  if (attempt.status !== 'in_progress') {
    return res.json({ data: { finished: true, attemptId: String(attempt._id) } });
  }
  const exam = await Exam.findById(attempt.examId);
  res.json({ data: { finished: false, ...svc.attemptPayload(attempt, exam) } });
});

exports.saveAnswers = asyncHandler(async (req, res) => {
  let attempt = await ownAttempt(req.params.id, req.user._id);
  attempt = await svc.ensureCurrent(attempt);
  if (attempt.status !== 'in_progress') {
    throw new ApiError(409, 'This attempt has already been submitted', { code: 'ALREADY_SUBMITTED', details: { attemptId: String(attempt._id) } });
  }
  if (svc.isOver(attempt, Date.now(), svc.graceMs())) {
    throw new ApiError(409, 'Time is up', { code: 'TIME_UP' });
  }
  const exam = await Exam.findById(attempt.examId);
  const saved = await svc.saveAnswers(attempt, exam, req.body.answers);
  res.json({ data: { savedAt: saved.lastSavedAt, remainingSeconds: Math.max(Math.floor((saved.expiresAt - Date.now()) / 1000), 0) } });
});

exports.submit = asyncHandler(async (req, res) => {
  const attempt = await ownAttempt(req.params.id, req.user._id);
  // Idempotent: a second submit (double click, retry, auto-submit racing a manual one) just returns the outcome.
  const done = await svc.finalizeAttempt(attempt._id, { incoming: req.body.answers });
  res.json({
    data: {
      attemptId: String(done._id),
      submittedAt: done.submittedAt,
      autoSubmitted: done.autoSubmitted,
      resultReleased: done.resultReleased,
    },
  });
});

// ---------- results ----------
const resultRow = (a, exam) => {
  const base = {
    _id: String(a._id),
    exam: exam ? { _id: String(exam._id), title: exam.title, subject: exam.subject } : { title: 'Deleted exam' },
    attemptNumber: a.attemptNumber,
    submittedAt: a.submittedAt,
    resultReleased: a.resultReleased,
  };
  if (!a.resultReleased) return { ...base, score: null, totalMarks: null, percentage: null, passed: null };
  return { ...base, score: a.score, totalMarks: a.totalMarks, percentage: a.percentage, passed: a.passed };
};

exports.listResults = asyncHandler(async (req, res) => {
  const p = parsePagination(req.query);
  const filter = { candidateId: req.user._id, status: 'submitted' };
  const [total, attempts] = await Promise.all([
    Attempt.countDocuments(filter),
    Attempt.find(filter).sort({ submittedAt: -1 }).skip(p.skip).limit(p.limit).populate('examId', 'title subject').lean(),
  ]);
  res.json({ data: attempts.map((a) => resultRow(a, a.examId)), meta: buildMeta(p, total) });
});

exports.getResult = asyncHandler(async (req, res) => {
  let attempt = await ownAttempt(req.params.id, req.user._id);
  attempt = await svc.ensureCurrent(attempt);
  if (attempt.status !== 'submitted') throw new ApiError(409, 'This exam is still in progress', { code: 'IN_PROGRESS' });
  const exam = await Exam.findById(attempt.examId);
  if (!exam) throw new ApiError(404, 'Exam no longer exists');

  const examInfo = { _id: String(exam._id), title: exam.title, subject: exam.subject, passingPercentage: exam.passingPercentage };
  if (!attempt.resultReleased) {
    // Nothing about score, answers or explanations is revealed until the teacher releases results.
    return res.json({
      data: {
        released: false,
        exam: examInfo,
        attempt: { _id: String(attempt._id), submittedAt: attempt.submittedAt, timeTaken: attempt.timeTaken, autoSubmitted: attempt.autoSubmitted },
      },
    });
  }
  res.json({ data: { released: true, attempt: svc.attemptSummary(attempt), exam: examInfo, review: svc.buildReview(attempt, exam) } });
});

// ---------- dashboard ----------
exports.dashboard = asyncHandler(async (req, res) => {
  const uid = req.user._id;
  const now = new Date();
  const [submitted, inProgress, openExams] = await Promise.all([
    Attempt.find({ candidateId: uid, status: 'submitted' }).sort({ submittedAt: -1 }).populate('examId', 'title subject').lean(),
    Attempt.findOne({ candidateId: uid, status: 'in_progress', expiresAt: { $gt: now } }).populate('examId', 'title').lean(),
    Exam.find({ status: 'published', 'questions.0': { $exists: true } }).sort({ createdAt: -1 }).limit(30),
  ]);

  const released = submitted.filter((a) => a.resultReleased);
  const sum = (arr, f) => arr.reduce((s, a) => s + f(a), 0);
  const stats = {
    totalAttempted: submitted.length,
    pendingRelease: submitted.length - released.length,
    averagePercentage: released.length ? round2(sum(released, (a) => a.percentage) / released.length) : 0,
    highestPercentage: released.length ? Math.max(...released.map((a) => a.percentage)) : 0,
    passed: released.filter((a) => a.passed).length,
    failed: released.filter((a) => !a.passed).length,
  };

  const mine = await Attempt.find({ candidateId: uid, examId: { $in: openExams.map((e) => e._id) } }).select('examId status expiresAt').lean();
  const available = openExams.map((e) => examCard(e, mine, now)).filter((e) => e.canStart).slice(0, 6);

  res.json({
    data: {
      profile: req.user.toPublic(),
      stats,
      availableExams: available,
      recentResults: submitted.slice(0, 5).map((a) => resultRow(a, a.examId)),
      inProgress: inProgress ? { attemptId: String(inProgress._id), examTitle: inProgress.examId?.title, expiresAt: inProgress.expiresAt } : null,
    },
  });
});
