const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true, trim: true, minlength: 3, maxlength: 1000 },
  options: {
    type: [{ type: String, trim: true, required: true, maxlength: 300 }],
    validate: [(v) => Array.isArray(v) && v.length >= 2 && v.length <= 4, 'A question must have between 2 and 4 options'],
  },
  correctOption: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator(v) {
        return Number.isInteger(v) && Array.isArray(this.options) && v < this.options.length;
      },
      message: 'correctOption must point to one of the options',
    },
  },
  explanation: { type: String, trim: true, maxlength: 2000, default: '' },
  marks: { type: Number, required: true, min: 0.25, max: 100, default: 1 },
  order: { type: Number, default: 0 },
});

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    subject: { type: String, required: true, trim: true, maxlength: 80 },
    duration: { type: Number, required: true, min: 1, max: 600 }, // minutes
    totalMarks: { type: Number, default: 0 }, // derived from questions
    passingPercentage: { type: Number, required: true, min: 0, max: 100, default: 40 },
    questions: { type: [questionSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    availability: {
      startAt: { type: Date, default: null },
      endAt: { type: Date, default: null },
    },
    allowMultipleAttempts: { type: Boolean, default: false },
    maxAttempts: { type: Number, min: 1, max: 10, default: 1 },
    resultReleaseSettings: {
      mode: { type: String, enum: ['immediate', 'manual'], default: 'immediate' },
    },
  },
  { timestamps: true }
);

examSchema.pre('validate', function derive(next) {
  this.questions.forEach((q, i) => {
    q.order = i + 1;
  });
  this.totalMarks = Math.round(this.questions.reduce((s, q) => s + (q.marks || 0), 0) * 100) / 100;
  if (!this.allowMultipleAttempts) this.maxAttempts = 1;
  const { startAt, endAt } = this.availability || {};
  if (startAt && endAt && endAt <= startAt) return next(new Error('End date must be after the start date'));
  next();
});

examSchema.index({ createdBy: 1, createdAt: -1 });
examSchema.index({ status: 1, 'availability.endAt': 1 });

module.exports = mongoose.model('Exam', examSchema);
