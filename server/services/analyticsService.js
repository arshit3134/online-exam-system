const Exam = require('../models/Exam');
const User = require('../models/User');
const Attempt = require('../models/ExamAttempt');
const { round2 } = require('./examService');

const teacherExamIds = (teacherId) => Exam.find({ createdBy: teacherId }).distinct('_id');
const submitted = (ids) => ({ examId: { $in: ids }, status: 'submitted' });

async function getOverview(teacherId) {
  const ids = await teacherExamIds(teacherId);
  const [totalStudents, publishedExams, agg, recent] = await Promise.all([
    User.countDocuments({ role: 'candidate' }),
    Exam.countDocuments({ createdBy: teacherId, status: 'published' }),
    Attempt.aggregate([
      { $match: submitted(ids) },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          avgScore: { $avg: '$score' },
          avgPercentage: { $avg: '$percentage' },
          maxScore: { $max: '$score' },
          minScore: { $min: '$score' },
          maxPercentage: { $max: '$percentage' },
          minPercentage: { $min: '$percentage' },
          passed: { $sum: { $cond: ['$passed', 1, 0] } },
        },
      },
    ]),
    Attempt.find(submitted(ids))
      .sort({ submittedAt: -1 })
      .limit(6)
      .populate('candidateId', 'name email')
      .populate('examId', 'title')
      .lean(),
  ]);
  const a = agg[0] || {};
  const total = a.totalAttempts || 0;
  return {
    stats: {
      totalStudents,
      totalExams: ids.length,
      publishedExams,
      totalAttempts: total,
      averageScore: round2(a.avgScore || 0),
      averagePercentage: round2(a.avgPercentage || 0),
      highestScore: a.maxScore ?? 0,
      lowestScore: a.minScore ?? 0,
      highestPercentage: a.maxPercentage ?? 0,
      lowestPercentage: a.minPercentage ?? 0,
      passPercentage: total ? round2((a.passed / total) * 100) : 0,
    },
    recentAttempts: recent.map((r) => ({
      _id: String(r._id),
      candidate: r.candidateId ? { name: r.candidateId.name, email: r.candidateId.email } : null,
      exam: r.examId ? { _id: String(r.examId._id), title: r.examId.title } : null,
      score: r.score,
      totalMarks: r.totalMarks,
      percentage: r.percentage,
      passed: r.passed,
      submittedAt: r.submittedAt,
    })),
  };
}

const BANDS = [
  { label: 'Below 40%', min: 0, max: 40 },
  { label: '40–59%', min: 40, max: 60 },
  { label: '60–74%', min: 60, max: 75 },
  { label: '75–89%', min: 75, max: 90 },
  { label: '90–100%', min: 90, max: 101 },
];

async function getCharts(teacherId) {
  const exams = await Exam.find({ createdBy: teacherId }).select('title totalMarks').lean();
  const ids = exams.map((e) => e._id);
  const titles = new Map(exams.map((e) => [String(e._id), e]));
  const match = { $match: submitted(ids) };

  const [perExam, passFailAgg, buckets, perStudent] = await Promise.all([
    Attempt.aggregate([
      match,
      {
        $group: {
          _id: '$examId',
          attempts: { $sum: 1 },
          avgScore: { $avg: '$score' },
          avgPercentage: { $avg: '$percentage' },
          passed: { $sum: { $cond: ['$passed', 1, 0] } },
          highest: { $max: '$percentage' },
          lowest: { $min: '$percentage' },
        },
      },
    ]),
    Attempt.aggregate([match, { $group: { _id: '$passed', count: { $sum: 1 } } }]),
    Attempt.aggregate([
      match,
      {
        $bucket: {
          groupBy: '$percentage',
          boundaries: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 101],
          default: 'other',
          output: { count: { $sum: 1 } },
        },
      },
    ]),
    Attempt.aggregate([match, { $group: { _id: '$candidateId', avg: { $avg: '$percentage' } } }]),
  ]);

  const examWise = perExam
    .map((r) => {
      const e = titles.get(String(r._id)) || {};
      return {
        examId: String(r._id),
        title: e.title || 'Deleted exam',
        totalMarks: e.totalMarks || 0,
        attempts: r.attempts,
        averageScore: round2(r.avgScore),
        averagePercentage: round2(r.avgPercentage),
        passRate: round2((r.passed / r.attempts) * 100),
        highest: r.highest,
        lowest: r.lowest,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  const pass = passFailAgg.find((p) => p._id === true)?.count || 0;
  const fail = passFailAgg.find((p) => p._id === false)?.count || 0;

  const bucketMap = new Map(buckets.map((b) => [b._id, b.count]));
  const scoreDistribution = [];
  for (let b = 0; b < 100; b += 10) {
    scoreDistribution.push({ range: b === 90 ? '90–100' : `${b}–${b + 9}`, count: bucketMap.get(b) || 0 });
  }

  const studentPerformance = BANDS.map((band) => ({
    band: band.label,
    students: perStudent.filter((s) => s.avg >= band.min && s.avg < band.max).length,
  }));

  return {
    examWise,
    passFail: [
      { name: 'Passed', value: pass },
      { name: 'Failed', value: fail },
    ],
    scoreDistribution,
    studentPerformance,
  };
}

async function getDifficultQuestions(teacherId, { examId, limit = 10, sortBy = 'percentage', minAttempts = 1 } = {}) {
  const examQuery = { createdBy: teacherId };
  if (examId) examQuery._id = examId;
  const exams = await Exam.find(examQuery).lean();
  if (!exams.length) return [];
  const ids = exams.map((e) => e._id);

  const rows = await Attempt.aggregate([
    { $match: submitted(ids) },
    { $unwind: '$answers' },
    {
      $group: {
        _id: { e: '$examId', q: '$answers.questionId', s: '$answers.selectedOption' },
        count: { $sum: 1 },
      },
    },
  ]);

  const stats = new Map();
  for (const r of rows) {
    const key = `${r._id.e}:${r._id.q}`;
    if (!stats.has(key)) stats.set(key, { total: 0, correct: 0, incorrect: 0, unanswered: 0, wrong: {} });
    const s = stats.get(key);
    s.total += r.count;
    s.sel = s.sel || {};
    s.sel[r._id.s === null ? 'null' : r._id.s] = r.count;
  }

  const out = [];
  for (const exam of exams) {
    for (const q of exam.questions) {
      const s = stats.get(`${exam._id}:${q._id}`);
      if (!s || s.total < minAttempts) continue;
      let correct = 0;
      let incorrect = 0;
      let unanswered = 0;
      let topWrong = null;
      for (const [sel, count] of Object.entries(s.sel)) {
        if (sel === 'null') unanswered += count;
        else if (Number(sel) === q.correctOption) correct += count;
        else {
          incorrect += count;
          if (!topWrong || count > topWrong.count) topWrong = { option: Number(sel), text: q.options[Number(sel)], count };
        }
      }
      out.push({
        questionId: String(q._id),
        examId: String(exam._id),
        examTitle: exam.title,
        questionNumber: q.order,
        questionText: q.questionText,
        options: q.options,
        correctOption: q.correctOption,
        correctAnswer: q.options[q.correctOption],
        explanation: q.explanation || '',
        totalAttempts: s.total,
        correctCount: correct,
        incorrectCount: incorrect,
        unansweredCount: unanswered,
        incorrectPercentage: round2((incorrect / s.total) * 100),
        mostChosenWrongOption: topWrong,
      });
    }
  }

  out.sort((a, b) =>
    sortBy === 'count'
      ? b.incorrectCount - a.incorrectCount || b.incorrectPercentage - a.incorrectPercentage
      : b.incorrectPercentage - a.incorrectPercentage || b.incorrectCount - a.incorrectCount
  );
  return out.filter((q) => q.incorrectCount > 0).slice(0, limit);
}

module.exports = { getOverview, getCharts, getDifficultQuestions, teacherExamIds };
