const ApiError = require('../utils/ApiError');

// Builds the candidate-facing question list explicitly, field by field, so that
// `correctOption` and `explanation` can never leak through an accidental spread.
const toCandidateQuestions = (exam) =>
  exam.questions.map((q, i) => ({
    _id: String(q._id),
    order: i + 1,
    questionText: q.questionText,
    options: [...q.options],
    marks: q.marks,
  }));

const availabilityOf = (exam, now = new Date()) => {
  const { startAt, endAt } = exam.availability || {};
  if (startAt && now < startAt) return 'upcoming';
  if (endAt && now > endAt) return 'ended';
  return 'open';
};

const assertPublishable = (data) => {
  if (data.status !== 'published') return;
  if (!data.questions || data.questions.length < 1) {
    throw new ApiError(400, 'Add at least one question before publishing the exam', { code: 'NO_QUESTIONS' });
  }
};

// Once attempts exist, the grading structure is frozen. Wording and explanations may still be fixed.
const structureChanged = (existing, incoming) =>
  existing.length !== incoming.length ||
  existing.some((q, i) => {
    const n = incoming[i];
    return (
      !n ||
      String(q._id) !== String(n._id) ||
      q.options.length !== n.options.length ||
      q.correctOption !== n.correctOption ||
      q.marks !== n.marks
    );
  });

const round2 = (n) => Math.round(n * 100) / 100;

module.exports = { toCandidateQuestions, availabilityOf, assertPublishable, structureChanged, round2 };
