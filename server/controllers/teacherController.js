const Exam = require('../models/Exam');
const User = require('../models/User');
const Attempt = require('../models/ExamAttempt');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, buildMeta, escapeRegex } = require('../utils/pagination');
const { assertPublishable, structureChanged, round2 } = require('../services/examService');
const analytics = require('../services/analyticsService');
const { buildReview, attemptSummary } = require('../services/attemptService');

const ownedExam = async (id, teacherId) => {
  const exam = await Exam.findOne({ _id: id, createdBy: teacherId });
  if (!exam) throw new ApiError(404, 'Exam not found');
  return exam;
};

const examDto = (exam) => {
  const o = exam.toObject ? exam.toObject() : exam;
  return { ...o, questionCount: o.questions.length };
};

// ---------- analytics ----------
exports.dashboard = asyncHandler(async (req, res) => {
  res.json({ data: await analytics.getOverview(req.user._id) });
});
exports.analytics = asyncHandler(async (req, res) => {
  res.json({ data: await analytics.getCharts(req.user._id) });
});
exports.difficultQuestions = asyncHandler(async (req, res) => {
  const { examId, limit, sortBy, minAttempts } = req.query;
  if (examId) await ownedExam(examId, req.user._id);
  res.json({ data: await analytics.getDifficultQuestions(req.user._id, { examId, limit, sortBy, minAttempts }) });
});

// ---------- exams ----------
exports.listExams = asyncHandler(async (req, res) => {
  const p = parsePagination(req.query);
  const filter = { createdBy: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ title: rx }, { subject: rx }];
  }
  const [total, exams] = await Promise.all([
    Exam.countDocuments(filter),
    Exam.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: p.skip },
      { $limit: p.limit },
      { $addFields: { questionCount: { $size: '$questions' } } },
      { $project: { questions: 0 } },
    ]),
  ]);
  const counts = await Attempt.aggregate([
    { $match: { examId: { $in: exams.map((e) => e._id) }, status: 'submitted' } },
    { $group: { _id: '$examId', attempts: { $sum: 1 }, avg: { $avg: '$percentage' } } },
  ]);
  const cm = new Map(counts.map((c) => [String(c._id), c]));
  const data = exams.map((e) => ({
    ...e,
    attemptCount: cm.get(String(e._id))?.attempts || 0,
    averagePercentage: round2(cm.get(String(e._id))?.avg || 0),
  }));
  res.json({ data, meta: buildMeta(p, total) });
});

exports.getExam = asyncHandler(async (req, res) => {
  const exam = await ownedExam(req.params.id, req.user._id);
  const [attempts, stats] = await Promise.all([
    Attempt.countDocuments({ examId: exam._id }),
    Attempt.aggregate([
      { $match: { examId: exam._id, status: 'submitted' } },
      {
        $group: {
          _id: null,
          submitted: { $sum: 1 },
          avg: { $avg: '$percentage' },
          passed: { $sum: { $cond: ['$passed', 1, 0] } },
          released: { $sum: { $cond: ['$resultReleased', 1, 0] } },
          highest: { $max: '$percentage' },
          lowest: { $min: '$percentage' },
        },
      },
    ]),
  ]);
  const s = stats[0] || {};
  res.json({
    data: {
      exam: examDto(exam),
      hasAttempts: attempts > 0,
      stats: {
        submitted: s.submitted || 0,
        averagePercentage: round2(s.avg || 0),
        passRate: s.submitted ? round2((s.passed / s.submitted) * 100) : 0,
        released: s.released || 0,
        unreleased: (s.submitted || 0) - (s.released || 0),
        highest: s.highest ?? 0,
        lowest: s.lowest ?? 0,
      },
    },
  });
});

exports.createExam = asyncHandler(async (req, res) => {
  assertPublishable(req.body);
  const { questions, ...rest } = req.body;
  const exam = await Exam.create({ ...rest, questions, createdBy: req.user._id });
  res.status(201).json({ data: { exam: examDto(exam) } });
});

exports.updateExam = asyncHandler(async (req, res) => {
  const exam = await ownedExam(req.params.id, req.user._id);
  assertPublishable(req.body);
  const hasAttempts = (await Attempt.countDocuments({ examId: exam._id })) > 0;
  if (hasAttempts) {
    if (req.body.passingPercentage !== exam.passingPercentage) {
      throw new ApiError(409, 'The passing percentage is locked because students have already attempted this exam', { code: 'LOCKED' });
    }
    if (structureChanged(exam.questions, req.body.questions)) {
      throw new ApiError(
        409,
        'Students have already attempted this exam. Question order, correct answers, marks and number of options are locked — you can still fix wording and explanations.',
        { code: 'LOCKED' }
      );
    }
  }
  const { questions, ...rest } = req.body;
  exam.set(rest);
  exam.questions = questions;
  await exam.save();
  res.json({ data: { exam: examDto(exam) } });
});

exports.setStatus = asyncHandler(async (req, res) => {
  const exam = await ownedExam(req.params.id, req.user._id);
  assertPublishable({ status: req.body.status, questions: exam.questions });
  exam.status = req.body.status;
  await exam.save();
  res.json({ data: { exam: examDto(exam) } });
});

exports.deleteExam = asyncHandler(async (req, res) => {
  const exam = await ownedExam(req.params.id, req.user._id);
  await Attempt.deleteMany({ examId: exam._id });
  await exam.deleteOne();
  res.json({ data: { message: 'Exam deleted' } });
});

exports.releaseExamResults = asyncHandler(async (req, res) => {
  const exam = await ownedExam(req.params.id, req.user._id);
  const { released } = req.body;
  const r = await Attempt.updateMany(
    { examId: exam._id, status: 'submitted' },
    { $set: { resultReleased: released, releasedAt: released ? new Date() : null } }
  );
  res.json({ data: { updated: r.modifiedCount, released } });
});

// ---------- attempts ----------
exports.examAttempts = asyncHandler(async (req, res) => {
  const exam = await ownedExam(req.params.id, req.user._id);
  const p = parsePagination(req.query);
  const filter = { examId: exam._id, status: 'submitted' };
  const [total, attempts, inProgress] = await Promise.all([
    Attempt.countDocuments(filter),
    Attempt.find(filter)
      .sort({ submittedAt: -1 })
      .skip(p.skip)
      .limit(p.limit)
      .populate('candidateId', 'name email')
      .select('-answers')
      .lean(),
    Attempt.countDocuments({ examId: exam._id, status: 'in_progress' }),
  ]);
  res.json({
    data: {
      exam: { _id: String(exam._id), title: exam.title, subject: exam.subject, totalMarks: exam.totalMarks, resultMode: exam.resultReleaseSettings.mode },
      inProgress,
      attempts: attempts.map((a) => ({
        ...attemptSummary(a),
        candidate: a.candidateId ? { _id: String(a.candidateId._id), name: a.candidateId.name, email: a.candidateId.email } : null,
      })),
    },
    meta: buildMeta(p, total),
  });
});

exports.attemptDetail = asyncHandler(async (req, res) => {
  const attempt = await Attempt.findById(req.params.id).populate('candidateId', 'name email');
  if (!attempt || attempt.status !== 'submitted') throw new ApiError(404, 'Attempt not found');
  const exam = await ownedExam(attempt.examId, req.user._id);
  res.json({
    data: {
      released: true, // teachers always see the full review
      resultReleased: attempt.resultReleased,
      attempt: attemptSummary(attempt),
      candidate: { name: attempt.candidateId?.name, email: attempt.candidateId?.email },
      exam: { _id: String(exam._id), title: exam.title, subject: exam.subject, passingPercentage: exam.passingPercentage },
      review: buildReview(attempt, exam),
    },
  });
});

exports.releaseAttempt = asyncHandler(async (req, res) => {
  const attempt = await Attempt.findById(req.params.id);
  if (!attempt || attempt.status !== 'submitted') throw new ApiError(404, 'Attempt not found');
  await ownedExam(attempt.examId, req.user._id);
  attempt.resultReleased = req.body.released;
  attempt.releasedAt = req.body.released ? new Date() : null;
  await attempt.save();
  res.json({ data: { resultReleased: attempt.resultReleased } });
});

// ---------- students ----------
exports.students = asyncHandler(async (req, res) => {
  const p = parsePagination(req.query);
  const filter = { role: 'candidate' };
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).lean(),
  ]);
  const examIds = await analytics.teacherExamIds(req.user._id);
  const stats = await Attempt.aggregate([
    { $match: { candidateId: { $in: users.map((u) => u._id) }, examId: { $in: examIds }, status: 'submitted' } },
    {
      $group: {
        _id: '$candidateId',
        attempts: { $sum: 1 },
        avg: { $avg: '$percentage' },
        best: { $max: '$percentage' },
        passed: { $sum: { $cond: ['$passed', 1, 0] } },
        last: { $max: '$submittedAt' },
      },
    },
  ]);
  const sm = new Map(stats.map((s) => [String(s._id), s]));
  res.json({
    data: users.map((u) => {
      const s = sm.get(String(u._id));
      return {
        _id: String(u._id),
        name: u.name,
        email: u.email,
        joinedAt: u.createdAt,
        attempts: s?.attempts || 0,
        averagePercentage: round2(s?.avg || 0),
        bestPercentage: s?.best ?? 0,
        passed: s?.passed || 0,
        lastAttemptAt: s?.last || null,
      };
    }),
    meta: buildMeta(p, total),
  });
});
