/*
 * Optional: populate demo data (1 teacher, 12 students, 3 exams, ~30 realistic attempts) so the dashboards
 * and analytics have something to show.  Refuses to run in production.
 *
 *   npm run seed:demo
 *
 * Demo logins (password for all: Demo1234):
 *   teacher@demo.dev   /   student1@demo.dev … student12@demo.dev
 */
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');
const Exam = require('../models/Exam');
const Attempt = require('../models/ExamAttempt');
const { grade } = require('../services/attemptService');

if (env.isProd) {
  console.error('Refusing to seed demo data in production.');
  process.exit(1);
}

const Q = (questionText, options, correctOption, explanation, marks = 2) => ({ questionText, options, correctOption, explanation, marks });

const EXAMS = [
  {
    title: 'JavaScript Fundamentals', subject: 'Computer Science', duration: 20, passingPercentage: 50,
    description: 'Core language concepts: types, scope, closures and the event loop.',
    questions: [
      Q('Which keyword declares a block-scoped variable that can be reassigned?', ['var', 'let', 'const', 'static'], 1, '`let` is block-scoped and reassignable. `const` cannot be reassigned; `var` is function-scoped.'),
      Q('What does `typeof null` return?', ['"null"', '"undefined"', '"object"', '"number"'], 2, 'A historical quirk: `typeof null` is "object".'),
      Q('Which method adds an element to the end of an array?', ['push()', 'pop()', 'shift()', 'unshift()'], 0, '`push()` appends; `pop()` removes from the end.'),
      Q('What is a closure?', ['A function bundled with its lexical environment', 'A way to close a browser tab', 'A private class field', 'A loop construct'], 0, 'A closure lets a function access variables from its outer scope even after the outer function returned.', 3),
      Q('What does `===` compare?', ['Value only', 'Value and type', 'Type only', 'Reference only'], 1, 'Strict equality compares both value and type without coercion.'),
      Q('Which of these is NOT a primitive type?', ['string', 'symbol', 'object', 'boolean'], 2, 'Objects are reference types.'),
    ],
  },
  {
    title: 'Algebra Basics', subject: 'Mathematics', duration: 15, passingPercentage: 40,
    description: 'Linear equations, factoring and exponents.',
    questions: [
      Q('Solve for x: 2x + 6 = 14', ['x = 2', 'x = 4', 'x = 8', 'x = 10'], 1, 'Subtract 6 → 2x = 8 → x = 4.'),
      Q('Factor: x² − 9', ['(x − 3)(x − 3)', '(x + 3)(x + 3)', '(x − 3)(x + 3)', 'Cannot be factored'], 2, 'Difference of squares: a² − b² = (a − b)(a + b).'),
      Q('What is 2³ × 2²?', ['2⁵', '2⁶', '4⁵', '2¹'], 0, 'Add exponents when multiplying like bases: 2³⁺² = 2⁵.'),
      Q('The slope of y = 3x − 5 is…', ['−5', '3', '5', '−3'], 1, 'In y = mx + b, m is the slope.'),
      Q('If f(x) = x² + 1, what is f(3)?', ['7', '9', '10', '12'], 2, '3² + 1 = 10.', 3),
    ],
  },
  {
    title: 'Cell Biology Quiz', subject: 'Biology', duration: 10, passingPercentage: 60,
    description: 'Organelles and their functions.',
    questions: [
      Q('Which organelle produces most of the cell\'s ATP?', ['Nucleus', 'Mitochondrion', 'Ribosome', 'Golgi apparatus'], 1, 'Mitochondria carry out oxidative phosphorylation.'),
      Q('Where does protein synthesis occur?', ['Ribosomes', 'Lysosomes', 'Vacuoles'], 0, 'Ribosomes translate mRNA into proteins.'),
      Q('Which structure controls what enters and leaves the cell?', ['Cell wall', 'Cytoplasm', 'Plasma membrane', 'Nucleolus'], 2, 'The plasma membrane is selectively permeable.'),
      Q('Photosynthesis takes place in…', ['Mitochondria', 'Chloroplasts', 'Peroxisomes', 'Endoplasmic reticulum'], 1, 'Chloroplasts contain chlorophyll.'),
    ],
  },
];

// Deterministic-ish pseudo random
let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

(async () => {
  await mongoose.connect(env.MONGODB_URI);
  await Promise.all([User.init(), Exam.init(), Attempt.init()]);

  const upsertUser = async (name, email, role) =>
    (await User.findOne({ email })) || User.create({ name, email, password: 'Demo1234', role });

  const teacher = await upsertUser('Dr. Maya Rao', 'teacher@demo.dev', 'teacher');
  const names = ['Aarav Shah', 'Isha Verma', 'Liam Chen', 'Sofia Rossi', 'Noah Kim', 'Zara Khan', 'Ethan Brown', 'Mia Patel', 'Lucas Silva', 'Ava Nguyen', 'Omar Ali', 'Chloe Martin'];
  const students = [];
  for (let i = 0; i < names.length; i++) students.push(await upsertUser(names[i], `student${i + 1}@demo.dev`, 'candidate'));

  await Attempt.deleteMany({ examId: { $in: await Exam.find({ createdBy: teacher._id }).distinct('_id') } });
  await Exam.deleteMany({ createdBy: teacher._id });

  let attempts = 0;
  for (const [ei, def] of EXAMS.entries()) {
    const exam = await Exam.create({
      ...def, createdBy: teacher._id, status: 'published',
      allowMultipleAttempts: false, resultReleaseSettings: { mode: 'immediate' },
    });
    const takers = students.filter((_, i) => (i + ei) % 3 !== 2 || ei === 0);
    for (const [si, stu] of takers.entries()) {
      const skill = 0.35 + rnd() * 0.6;
      const answers = exam.questions.map((q, qi) => {
        const hard = qi === 1 || qi === 3 ? 0.55 : 1; // make a couple of questions harder
        if (rnd() < 0.05) return { questionId: q._id, selectedOption: null };
        if (rnd() < skill * hard) return { questionId: q._id, selectedOption: q.correctOption };
        const wrong = q.options.map((_, i) => i).filter((i) => i !== q.correctOption);
        return { questionId: q._id, selectedOption: wrong[Math.floor(rnd() * wrong.length)] };
      });
      const g = grade(exam, answers);
      const started = new Date(Date.now() - (si + 1 + ei * 2) * 36e5 * 5);
      const taken = Math.round(exam.duration * 60 * (0.4 + rnd() * 0.5));
      await Attempt.create({
        examId: exam._id, candidateId: stu._id, attemptNumber: 1, ...g, status: 'submitted',
        startedAt: started, expiresAt: new Date(started.getTime() + exam.duration * 60000),
        submittedAt: new Date(started.getTime() + taken * 1000), timeTaken: taken, resultReleased: true, releasedAt: new Date(),
      });
      attempts++;
    }
  }
  console.log(`✅ Demo data ready: ${EXAMS.length} exams, ${students.length} students, ${attempts} attempts`);
  console.log('   Teacher: teacher@demo.dev / Demo1234   |   Student: student1@demo.dev / Demo1234');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
