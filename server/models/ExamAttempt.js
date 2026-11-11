const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    selectedOption: { type: Number, min: 0, max: 3, default: null },
    isCorrect: { type: Boolean, default: null }, // null = unanswered (set on submit)
    marksAwarded: { type: Number, default: 0 },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attemptNumber: { type: Number, default: 1 },
    answers: { type: [answerSchema], default: [] },
    score: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    correctCount: { type: Number, default: 0 },
    incorrectCount: { type: Number, default: 0 },
    unansweredCount: { type: Number, default: 0 },
    startedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
    submittedAt: { type: Date, default: null },
    lastSavedAt: { type: Date, default: null },
    timeTaken: { type: Number, default: 0 }, // seconds
    status: { type: String, enum: ['in_progress', 'submitted'], default: 'in_progress' },
    autoSubmitted: { type: Boolean, default: false },
    resultReleased: { type: Boolean, default: false },
    releasedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

attemptSchema.index({ examId: 1, candidateId: 1, attemptNumber: 1 }, { unique: true });
// At most one in-progress attempt per candidate per exam (guards against double-click / race on start)
attemptSchema.index(
  { examId: 1, candidateId: 1 },
  { unique: true, partialFilterExpression: { status: 'in_progress' }, name: 'one_in_progress_per_exam' }
);
attemptSchema.index({ candidateId: 1, status: 1, submittedAt: -1 });
attemptSchema.index({ examId: 1, status: 1 });
attemptSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model('ExamAttempt', attemptSchema);
