const mongoose = require('mongoose');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const Exam = require('../models/Exam');
const Attempt = require('../models/ExamAttempt');
const { availabilityOf, round2, toCandidateQuestions } = require('./examService');

const graceMs = () => env.SUBMIT_GRACE_SECONDS * 1000;
const isOver = (attempt, now = Date.now(), grace = 0) => now > attempt.expiresAt.getTime() + grace;

const maxAttemptsOf = (exam) => (exam.allowMultipleAttempts ? exam.maxAttempts : 1);

function normalizeIncoming(exam, incoming = []) {
  const byId = new Map(exam.questions.map((q) => [String(q._id), q]));
  const latest = new Map();
  for (const a of incoming) {
    const q = byId.get(String(a.questionId));
    if (!q) throw new ApiError(400, 'Answer references an unknown question', { code: 'INVALID_QUESTION' });
    if (a.selectedOption !== null && a.selectedOption >= q.options.length) {
      throw new ApiError(400, 'Selected option is out of range', { code: 'INVALID_OPTION' });
    }
    latest.set(String(q._id), a.selectedOption);
  }
  return [...latest].map(([questionId, selectedOption]) => ({ questionId, selectedOption }));
}

function grade(exam, answers) {
  const selected = new Map(answers.map((a) => [String(a.questionId), a.selectedOption]));
  let score = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  const graded = exam.questions.map((q) => {
    const sel = selected.has(String(q._id)) ? selected.get(String(q._id)) : null;
    if (sel === null || sel === undefined) {
      unansweredCount += 1;
      return { questionId: q._id, selectedOption: null, isCorrect: null, marksAwarded: 0 };
    }
    if (sel === q.correctOption) {
      correctCount += 1;
      score += q.marks;
      return { questionId: q._id, selectedOption: sel, isCorrect: true, marksAwarded: q.marks };
    }
    incorrectCount += 1;
    return { questionId: q._id, selectedOption: sel, isCorrect: false, marksAwarded: 0 };
  });

  const totalMarks = exam.totalMarks;
  const percentage = totalMarks > 0 ? round2((score / totalMarks) * 100) : 0;
  return {
    answers: graded,
    score: round2(score),
    totalMarks,
    percentage,
    passed: percentage >= exam.passingPercentage,
    correctCount,
    incorrectCount,
    unansweredCount,
  };
}

async function finalizeAttempt(attemptId, { incoming, auto = false } = {}) {
  const attempt = await Attempt.findById(attemptId);
  if (!attempt) throw new ApiError(404, 'Attempt not found');
  if (attempt.status !== 'in_progress') return attempt;

  const exam = await Exam.findById(attempt.examId);
  if (!exam) throw new ApiError(404, 'Exam no longer exists');

  const now = new Date();
  const merged = new Map(attempt.answers.map((a) => [String(a.questionId), a.selectedOption]));
  if (incoming && !isOver(attempt, now.getTime(), graceMs())) {
    for (const a of normalizeIncoming(exam, incoming)) merged.set(a.questionId, a.selectedOption);
  }

  const result = grade(exam, [...merged].map(([questionId, selectedOption]) => ({ questionId, selectedOption })));
  const effectiveEnd = Math.min(now.getTime(), attempt.expiresAt.getTime());
  const timeTaken = Math.max(Math.round((effectiveEnd - attempt.startedAt.getTime()) / 1000), 0);
  const released = exam.resultReleaseSettings.mode === 'immediate';

  const updated = await Attempt.findOneAndUpdate(
    { _id: attempt._id, status: 'in_progress' },
    {
      $set: {
        ...result,
        status: 'submitted',
        submittedAt: now,
        timeTaken,
        autoSubmitted: auto || isOver(attempt, now.getTime()),
        resultReleased: released,
        releasedAt: released ? now : null,
      },
    },
    { new: true }
  );
  return updated || Attempt.findById(attempt._id);
}

async function ensureCurrent(attempt) {
  if (attempt.status === 'in_progress' && isOver(attempt, Date.now(), graceMs())) {
    return finalizeAttempt(attempt._id, { auto: true });
  }
  return attempt;
}

async function startAttempt(exam, user) {
  if (exam.status !== 'published') throw new ApiError(403, 'This exam is not available', { code: 'NOT_PUBLISHED' });
  const state = availabilityOf(exam);
  if (state === 'upcoming') throw new ApiError(403, 'This exam has not started yet', { code: 'NOT_STARTED' });
  if (state === 'ended') throw new ApiError(403, 'This exam is closed', { code: 'EXAM_CLOSED' });
  if (!exam.questions.length) throw new ApiError(409, 'This exam has no questions yet');

  let existing = await Attempt.findOne({ examId: exam._id, candidateId: user._id, status: 'in_progress' });
  if (existing) {
    existing = await ensureCurrent(existing);
    if (existing.status === 'in_progress') return existing;
  }

  const used = await Attempt.countDocuments({ examId: exam._id, candidateId: user._id, status: 'submitted' });
  if (used >= maxAttemptsOf(exam)) {
    throw new ApiError(409, 'You have used all attempts for this exam', { code: 'MAX_ATTEMPTS' });
  }

  const now = Date.now();
  let expires = now + exam.duration * 60 * 1000;
  if (exam.availability.endAt) expires = Math.min(expires, exam.availability.endAt.getTime());
  if (expires - now < 5000) throw new ApiError(403, 'This exam is about to close', { code: 'EXAM_CLOSED' });

  try {
    return await Attempt.create({
      examId: exam._id,
      candidateId: user._id,
      attemptNumber: used + 1,
      startedAt: new Date(now),
      expiresAt: new Date(expires),
      answers: exam.questions.map((q) => ({ questionId: q._id, selectedOption: null })),
    });
  } catch (err) {
    if (err.code === 11000) {
      const other = await Attempt.findOne({ examId: exam._id, candidateId: user._id, status: 'in_progress' });
      if (other) return other;
    }
    throw err;
  }
}

async function saveAnswers(attempt, exam, incoming) {
  const answers = normalizeIncoming(exam, incoming);
  if (!answers.length) return attempt;
  const set = { lastSavedAt: new Date() };
  const arrayFilters = [];
  answers.forEach((a, i) => {
    set[`answers.$[f${i}].selectedOption`] = a.selectedOption;
    arrayFilters.push({ [`f${i}.questionId`]: new mongoose.Types.ObjectId(a.questionId) });
  });
  const res = await Attempt.updateOne({ _id: attempt._id, status: 'in_progress' }, { $set: set }, { arrayFilters });
  if (!res.matchedCount) throw new ApiError(409, 'This attempt has already been submitted', { code: 'ALREADY_SUBMITTED' });
  return Attempt.findById(attempt._id);
}

function attemptPayload(attempt, exam) {
  const remainingSeconds = Math.max(Math.floor((attempt.expiresAt.getTime() - Date.now()) / 1000), 0);
  return {
    attempt: {
      _id: String(attempt._id),
      status: attempt.status,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      remainingSeconds,
      answers: attempt.answers.map((a) => ({ questionId: String(a.questionId), selectedOption: a.selectedOption })),
    },
    exam: {
      _id: String(exam._id),
      title: exam.title,
      subject: exam.subject,
      duration: exam.duration,
      totalMarks: exam.totalMarks,
      questions: toCandidateQuestions(exam),
    },
  };
}

function buildReview(attempt, exam) {
  const byId = new Map(attempt.answers.map((a) => [String(a.questionId), a]));
  return exam.questions.map((q, i) => {
    const a = byId.get(String(q._id));
    return {
      questionId: String(q._id),
      order: i + 1,
      questionText: q.questionText,
      options: [...q.options],
      marks: q.marks,
      selectedOption: a ? a.selectedOption : null,
      correctOption: q.correctOption,
      isCorrect: a ? a.isCorrect : null,
      marksAwarded: a ? a.marksAwarded : 0,
      explanation: q.explanation || '',
    };
  });
}

const attemptSummary = (a) => ({
  _id: String(a._id),
  attemptNumber: a.attemptNumber,
  status: a.status,
  startedAt: a.startedAt,
  submittedAt: a.submittedAt,
  timeTaken: a.timeTaken,
  autoSubmitted: a.autoSubmitted,
  resultReleased: a.resultReleased,
  score: a.score,
  totalMarks: a.totalMarks,
  percentage: a.percentage,
  passed: a.passed,
  correctCount: a.correctCount,
  incorrectCount: a.incorrectCount,
  unansweredCount: a.unansweredCount,
});

async function sweepExpired() {
  const cutoff = new Date(Date.now() - graceMs());
  const stale = await Attempt.find({ status: 'in_progress', expiresAt: { $lt: cutoff } }).select('_id').limit(200).lean();
  for (const s of stale) {
    try {
      await finalizeAttempt(s._id, { auto: true });
    } catch (e) {
      console.error('sweep failed for', s._id, e.message);
    }
  }
  return stale.length;
}

module.exports = {
  grade,
  startAttempt,
  saveAnswers,
  finalizeAttempt,
  ensureCurrent,
  attemptPayload,
  buildReview,
  attemptSummary,
  sweepExpired,
  maxAttemptsOf,
  isOver,
  graceMs,
};
