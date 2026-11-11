const { z, objectId, pagination } = require('./common');

const optionalDate = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? null : v),
  z.coerce.date().nullable()
);

const questionSchema = z
  .object({
    _id: objectId.optional(),
    questionText: z.string().trim().min(3, 'Question text is too short').max(1000),
    options: z.array(z.string().trim().min(1, 'Options cannot be empty').max(300)).min(2, 'At least 2 options are required').max(4, 'A maximum of 4 options is allowed'),
    correctOption: z.number().int().min(0),
    explanation: z.string().trim().max(2000).optional().default(''),
    marks: z.number().min(0.25).max(100).default(1),
  })
  .superRefine((q, ctx) => {
    if (q.correctOption >= q.options.length) {
      ctx.addIssue({ code: 'custom', path: ['correctOption'], message: 'Select the correct answer from the available options' });
    }
    const lower = q.options.map((o) => o.toLowerCase());
    if (new Set(lower).size !== lower.length) {
      ctx.addIssue({ code: 'custom', path: ['options'], message: 'Options must be unique' });
    }
  });

exports.examBody = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150),
  description: z.string().trim().max(2000).optional().default(''),
  subject: z.string().trim().min(2, 'Subject is required').max(80),
  duration: z.number().int().min(1, 'Duration must be at least 1 minute').max(600),
  passingPercentage: z.number().min(0).max(100),
  status: z.enum(['draft', 'published']).default('draft'),
  availability: z
    .object({ startAt: optionalDate.optional().default(null), endAt: optionalDate.optional().default(null) })
    .default({}),
  allowMultipleAttempts: z.boolean().default(false),
  maxAttempts: z.number().int().min(1).max(10).default(1),
  resultReleaseSettings: z.object({ mode: z.enum(['immediate', 'manual']).default('immediate') }).default({}),
  questions: z.array(questionSchema).max(200).default([]),
});

exports.statusBody = z.object({ status: z.enum(['draft', 'published']) });
exports.releaseBody = z.object({ released: z.boolean() });

exports.listExamsQuery = z.object({
  ...pagination,
  q: z.string().trim().max(100).optional(),
  status: z.enum(['draft', 'published']).optional(),
});

exports.listQuery = z.object({ ...pagination, q: z.string().trim().max(100).optional() });

exports.difficultQuery = z.object({
  examId: objectId.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['percentage', 'count']).default('percentage'),
  minAttempts: z.coerce.number().int().min(1).default(1),
});

exports.saveAnswersBody = z.object({
  answers: z
    .array(z.object({ questionId: objectId, selectedOption: z.number().int().min(0).max(3).nullable() }))
    .max(200),
});

exports.submitBody = z.object({ answers: exports.saveAnswersBody.shape.answers.optional() }).default({});
