/*
 * End-to-end API test. Spins up an in-memory MongoDB (or uses E2E_MONGODB_URI) and drives the real HTTP API.
 *   npm run test:e2e
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-secret-e2e-secret-e2e-secret-e2e-secret';
process.env.SUBMIT_GRACE_SECONDS = '1';

const assert = require('assert');
const http = require('http');

let passed = 0;
const ok = (name) => console.log(`  ✓ ${name}`) || passed++;

class Client {
  constructor(base) { this.base = base; this.cookie = ''; }
  async req(method, path, body, headers = {}) {
    const res = await fetch(this.base + path, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...(this.cookie && { Cookie: this.cookie }), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.getSetCookie?.() || [];
    if (set.length) {
      const c = set[0].split(';')[0];
      this.cookie = c.endsWith('=') ? '' : c;
      this.rawSetCookie = set[0];
    }
    let json = null;
    try { json = await res.json(); } catch { /* empty */ }
    return { status: res.status, body: json };
  }
  get(p) { return this.req('GET', p); }
  post(p, b) { return this.req('POST', p, b || {}); }
  put(p, b) { return this.req('PUT', p, b); }
  patch(p, b) { return this.req('PATCH', p, b); }
  del(p) { return this.req('DELETE', p); }
}

(async () => {
  let mongod;
  if (process.env.E2E_MONGODB_URI) process.env.MONGODB_URI = process.env.E2E_MONGODB_URI;
  else {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri('exam-e2e');
  }

  const mongoose = require('mongoose');
  const connectDB = require('../config/db');
  await connectDB();
  await mongoose.connection.db.dropDatabase();
  const User = require('../models/User');
  const Attempt = require('../models/ExamAttempt');
  await Promise.all([User.init(), Attempt.init(), require('../models/Exam').init()]);
  const app = require('../app');
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/api`;

  const teacher = new Client(base);
  const alice = new Client(base);
  const bob = new Client(base);
  const anon = new Client(base);

  console.log('\nAuth & security');
  await User.create({ name: 'Prof Teacher', email: 'teacher@test.dev', password: 'Teacher123', role: 'teacher' });
  let r = await anon.post('/auth/register', { name: 'Eve Hacker', email: 'eve@test.dev', password: 'Passw0rdX', role: 'teacher' });
  assert.equal(r.status, 201); assert.equal(r.body.data.user.role, 'candidate'); ok('registration ignores role=teacher');
  assert.ok(!JSON.stringify(r.body).includes('password')); ok('password never returned');
  assert.match(anon.rawSetCookie, /HttpOnly/i); ok('auth cookie is HttpOnly');
  r = await new Client(base).req('POST', '/auth/login', { email: 'x@y.z', password: 'x' }, { 'X-Requested-With': '' });
  assert.equal(r.status, 403); ok('CSRF header required on POST');
  r = await new Client(base).post('/auth/login', { email: { $gt: '' }, password: { $gt: '' } });
  assert.equal(r.status, 400); ok('NoSQL operator injection rejected');
  r = await new Client(base).post('/auth/login', { email: 'teacher@test.dev', password: 'wrongpass1' });
  assert.equal(r.status, 401); ok('bad password rejected');
  r = await new Client(base).post('/auth/login', { email: 'teacher@test.dev', password: 'Teacher123', portal: 'candidate' });
  assert.equal(r.status, 403); ok('teacher cannot sign in through student portal');
  r = await teacher.post('/auth/login', { email: 'teacher@test.dev', password: 'Teacher123', portal: 'teacher' });
  assert.equal(r.status, 200); ok('teacher login');
  const stored = await User.findOne({ email: 'teacher@test.dev' }).select('+password');
  assert.ok(stored.password.startsWith('$2')); ok('password stored as bcrypt hash');
  await alice.post('/auth/register', { name: 'Alice', email: 'alice@test.dev', password: 'Alice1234' });
  await bob.post('/auth/register', { name: 'Bob', email: 'bob@test.dev', password: 'Bob123456' });
  assert.equal((await alice.get('/auth/me')).body.data.user.email, 'alice@test.dev'); ok('/auth/me persistent session');
  assert.equal((await anon.get('/teacher/dashboard')).status, 403); ok('candidate cannot hit teacher API (403)');
  assert.equal((await new Client(base).get('/teacher/dashboard')).status, 401); ok('unauthenticated -> 401');
  assert.equal((await alice.get('/teacher/exams')).status, 403); ok('RBAC enforced for candidate');

  console.log('\nExam management');
  const mkQ = (t, correct, marks = 2, n = 4) => ({ questionText: t, options: ['A1', 'B2', 'C3', 'D4'].slice(0, n), correctOption: correct, marks, explanation: `Because ${t}` });
  const examBody = (over = {}) => ({
    title: 'Algebra Basics', description: 'desc', subject: 'Math', duration: 30, passingPercentage: 50, status: 'published',
    availability: {}, allowMultipleAttempts: false, maxAttempts: 1, resultReleaseSettings: { mode: 'immediate' },
    questions: [mkQ('Q one', 0), mkQ('Q two', 1), mkQ('Q three', 2, 2, 3), mkQ('Q four', 3)], ...over,
  });
  r = await teacher.post('/teacher/exams', examBody({ questions: [{ ...mkQ('Five opts', 0), options: ['a', 'b', 'c', 'd', 'e'] }] }));
  assert.equal(r.status, 400); ok('more than 4 options rejected');
  r = await teacher.post('/teacher/exams', examBody({ questions: [{ ...mkQ('One opt', 0), options: ['a'] }] }));
  assert.equal(r.status, 400); ok('fewer than 2 options rejected');
  r = await teacher.post('/teacher/exams', examBody({ questions: [mkQ('bad correct', 3, 1, 3)] }));
  assert.equal(r.status, 400); ok('correct option must exist');
  r = await teacher.post('/teacher/exams', examBody({ questions: [] }));
  assert.equal(r.status, 400); ok('cannot publish without questions');
  r = await teacher.post('/teacher/exams', examBody());
  assert.equal(r.status, 201);
  const exam = r.body.data.exam; const examId = exam._id;
  assert.equal(exam.totalMarks, 8); assert.equal(exam.questions[2].order, 3); ok('exam created; totalMarks derived server-side = 8');
  r = await teacher.post('/teacher/exams', examBody({ title: 'Draft Exam', status: 'draft', questions: [mkQ('Draft question', 0)] }));
  const draftId = r.body.data.exam._id;

  console.log('\nCandidate exam flow');
  r = await alice.get('/candidate/exams');
  assert.equal(r.body.data.length, 1); assert.ok(!JSON.stringify(r.body).includes('correctOption')); ok('candidate sees only published exams, no answer key');
  assert.equal((await alice.post(`/candidate/exams/${draftId}/start`)).status, 404); ok('draft exam cannot be started');
  r = await alice.post(`/candidate/exams/${examId}/start`);
  assert.equal(r.status, 201);
  const payload = r.body.data; const aid = payload.attempt._id;
  const txt = JSON.stringify(payload);
  assert.ok(!txt.includes('correctOption') && !txt.includes('explanation') && !txt.includes('Because')); ok('start payload contains NO answer key / explanations');
  assert.equal(payload.exam.questions.length, 4); ok('questions delivered');
  const r2 = await alice.post(`/candidate/exams/${examId}/start`);
  assert.equal(r2.body.data.attempt._id, aid); ok('start is idempotent (resumes same attempt)');
  const qs = payload.exam.questions;
  r = await alice.put(`/candidate/attempts/${aid}/answers`, { answers: [{ questionId: qs[0]._id, selectedOption: 0 }, { questionId: qs[1]._id, selectedOption: 0 }] });
  assert.equal(r.status, 200); ok('answers autosaved');
  r = await alice.put(`/candidate/attempts/${aid}/answers`, { answers: [{ questionId: qs[2]._id, selectedOption: 3 }] });
  assert.equal(r.status, 400); ok('option out of range rejected (question 3 has 3 options)');
  r = await alice.get(`/candidate/attempts/${aid}`);
  assert.equal(r.body.data.attempt.answers.find((a) => a.questionId === qs[0]._id).selectedOption, 0); ok('refresh restores saved answers');
  assert.ok(!JSON.stringify(r.body).includes('correctOption')); 
  assert.equal((await bob.get(`/candidate/attempts/${aid}`)).status, 404); ok("another candidate cannot access Alice's attempt");
  r = await alice.get(`/candidate/results/${aid}`);
  assert.equal(r.status, 409); ok('result unavailable while in progress');

  // Submit: client sends tampered extras; server grades itself
  r = await alice.post(`/candidate/attempts/${aid}/submit`, { answers: [{ questionId: qs[1]._id, selectedOption: 1 }, { questionId: qs[2]._id, selectedOption: 2 }], score: 999, percentage: 100 });
  assert.equal(r.status, 200); ok('submit accepted (client-sent score ignored)');
  const dup = await Promise.all([alice.post(`/candidate/attempts/${aid}/submit`), alice.post(`/candidate/attempts/${aid}/submit`)]);
  assert.ok(dup.every((d) => d.status === 200)); assert.equal(await Attempt.countDocuments({ candidateId: (await User.findOne({ email: 'alice@test.dev' }))._id, status: 'submitted' }), 1); ok('duplicate/concurrent submit is idempotent');
  r = await alice.put(`/candidate/attempts/${aid}/answers`, { answers: [{ questionId: qs[3]._id, selectedOption: 3 }] });
  assert.equal(r.status, 409); ok('cannot modify answers after submission');
  r = await alice.post(`/candidate/exams/${examId}/start`);
  assert.equal(r.status, 409); assert.equal(r.body.code, 'MAX_ATTEMPTS'); ok('duplicate attempt blocked');
  r = await alice.get(`/candidate/results/${aid}`);
  // Q1 correct (0) =2, Q2 correct(1)=2, Q3 correct(2)=2, Q4 unanswered
  assert.equal(r.body.data.released, true); const a = r.body.data.attempt;
  assert.equal(a.score, 6); assert.equal(a.percentage, 75); assert.equal(a.correctCount, 3); assert.equal(a.unansweredCount, 1); assert.equal(a.passed, true); ok('server-side grading correct (6/8 = 75%, passed)');
  assert.equal(r.body.data.review.length, 4); assert.ok(r.body.data.review[0].explanation.startsWith('Because')); assert.equal(r.body.data.review[3].isCorrect, null); ok('released result includes review + explanations');

  console.log('\nManual release + analytics');
  await teacher.put(`/teacher/exams/${examId}`, examBody({ resultReleaseSettings: { mode: 'manual' }, questions: exam.questions.map((q) => ({ ...q, _id: q._id })) }));
  r = await bob.post(`/candidate/exams/${examId}/start`);
  const bid = r.body.data.attempt._id; const bq = r.body.data.exam.questions;
  await bob.post(`/candidate/attempts/${bid}/submit`, { answers: [{ questionId: bq[0]._id, selectedOption: 1 }, { questionId: bq[1]._id, selectedOption: 2 }, { questionId: bq[2]._id, selectedOption: 0 }, { questionId: bq[3]._id, selectedOption: 3 }] });
  r = await bob.get(`/candidate/results/${bid}`);
  assert.equal(r.body.data.released, false); assert.ok(!JSON.stringify(r.body).match(/correctOption|score|explanation|Because/)); ok('unreleased result hides score, answers and explanations');
  r = await bob.get('/candidate/results'); assert.equal(r.body.data[0].score, null); ok('results list hides marks until release');
  r = await teacher.get(`/teacher/attempts/${bid}`); assert.equal(r.body.data.attempt.score, 2); ok('teacher sees full result (2/8)');
  assert.equal((await teacher.get(`/teacher/exams/${examId}/attempts`)).body.data.attempts.length, 2); ok('teacher lists attempts per exam');
  r = await teacher.patch(`/teacher/exams/${examId}/release-results`, { released: true });
  assert.equal(r.status, 200);
  r = await bob.get(`/candidate/results/${bid}`); assert.equal(r.body.data.released, true); assert.equal(r.body.data.attempt.passed, false); ok('manual release reveals results');

  r = await teacher.get('/teacher/dashboard'); const st = r.body.data.stats;
  assert.equal(st.totalAttempts, 2); assert.equal(st.totalStudents, 3); assert.equal(st.highestScore, 6); assert.equal(st.lowestScore, 2); assert.equal(st.passPercentage, 50); assert.equal(st.averageScore, 4); ok('dashboard stats computed from real attempts');
  r = await teacher.get('/teacher/analytics'); const an = r.body.data;
  assert.equal(an.passFail[0].value, 1); assert.equal(an.passFail[1].value, 1); assert.equal(an.scoreDistribution.reduce((s, b) => s + b.count, 0), 2); assert.equal(an.examWise[0].attempts, 2); ok('analytics charts data');
  r = await teacher.get('/teacher/difficult-questions');
  const dq = r.body.data;
  // Q1: alice correct, bob wrong => 50%; Q2: alice correct, bob wrong => 50%; Q3: alice correct,bob wrong 50%; Q4: alice unanswered, bob correct => 0 wrong
  assert.ok(dq.length === 3 && dq.every((q) => q.incorrectPercentage === 50 && q.totalAttempts === 2)); assert.ok(dq[0].correctAnswer && dq[0].examTitle === 'Algebra Basics'); ok('most difficult questions ranked from attempt data');

  console.log('\nLocking & ownership');
  const edited = exam.questions.map((q) => ({ ...q })); edited[0].correctOption = 1;
  r = await teacher.put(`/teacher/exams/${examId}`, examBody({ resultReleaseSettings: { mode: 'manual' }, questions: edited }));
  assert.equal(r.status, 409); ok('grading structure locked once attempted');
  const reword = exam.questions.map((q) => ({ ...q })); reword[0].questionText = 'Q one (fixed typo)'; reword[0].explanation = 'Updated';
  r = await teacher.put(`/teacher/exams/${examId}`, examBody({ resultReleaseSettings: { mode: 'manual' }, questions: reword }));
  assert.equal(r.status, 200); ok('wording/explanation edits still allowed');
  const t2 = new Client(base); await User.create({ name: 'T2', email: 't2@test.dev', password: 'Teacher234', role: 'teacher' }); await t2.post('/auth/login', { email: 't2@test.dev', password: 'Teacher234' });
  assert.equal((await t2.get(`/teacher/exams/${examId}`)).status, 404); assert.equal((await t2.get(`/teacher/attempts/${bid}`)).status, 404); ok("teachers cannot access each other's exams/attempts");
  r = await teacher.patch(`/teacher/exams/${draftId}/status`, { status: 'published' }); assert.equal(r.status, 200); ok('publish toggle');

  console.log('\nTimer enforcement');
  const timed = await teacher.post('/teacher/exams', examBody({ title: 'Timed', questions: [mkQ('Timed one', 0, 1), mkQ('Timed two', 1, 1)], resultReleaseSettings: { mode: 'immediate' } }));
  const tid = timed.body.data.exam._id;
  r = await alice.post(`/candidate/exams/${tid}/start`); const tAid = r.body.data.attempt._id; const tq = r.body.data.exam.questions;
  await alice.put(`/candidate/attempts/${tAid}/answers`, { answers: [{ questionId: tq[0]._id, selectedOption: 0 }] });
  await Attempt.updateOne({ _id: tAid }, { $set: { expiresAt: new Date(Date.now() - 60000) } }); // simulate expiry
  r = await alice.post(`/candidate/attempts/${tAid}/submit`, { answers: [{ questionId: tq[1]._id, selectedOption: 1 }] });
  assert.equal(r.status, 200); assert.equal(r.body.data.autoSubmitted, true);
  r = await alice.get(`/candidate/results/${tAid}`);
  assert.equal(r.body.data.attempt.correctCount, 1); ok('late answers ignored after deadline; saved answers graded; flagged auto-submitted');
  // sweeper
  r = await bob.post(`/candidate/exams/${tid}/start`); const sAid = r.body.data.attempt._id;
  await Attempt.updateOne({ _id: sAid }, { $set: { expiresAt: new Date(Date.now() - 60000) } });
  const swept = await require('../services/attemptService').sweepExpired();
  assert.equal(swept, 1); assert.equal((await Attempt.findById(sAid)).status, 'submitted'); ok('background sweeper auto-submits abandoned attempts');

  console.log('\nAvailability window');
  const future = await teacher.post('/teacher/exams', examBody({ title: 'Future', availability: { startAt: new Date(Date.now() + 3600e3).toISOString(), endAt: null }, questions: [mkQ('Future question', 0)] }));
  r = await alice.post(`/candidate/exams/${future.body.data.exam._id}/start`); assert.equal(r.status, 403); ok('exam outside availability window cannot be started');

  console.log('\nTeacher delete');
  assert.equal((await teacher.del(`/teacher/exams/${draftId}`)).status, 200); ok('exam deleted');
  assert.equal((await teacher.post('/auth/logout')).status, 200); assert.equal((await teacher.get('/auth/me')).status, 401); ok('logout clears session');

  console.log(`\n✅ ${passed} checks passed`);
  server.close(); await mongoose.disconnect(); if (mongod) await mongod.stop();
  process.exit(0);
})().catch((e) => { console.error('\n❌ E2E FAILED:', e); process.exit(1); });
