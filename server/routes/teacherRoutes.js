const router = require('express').Router();
const c = require('../controllers/teacherController');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const v = require('../validators/exam');
const { idParams, paginationQuery } = require('../validators/common');

router.use(protect, authorize('teacher'));

router.get('/dashboard', c.dashboard);
router.get('/analytics', c.analytics);
router.get('/difficult-questions', validate({ query: v.difficultQuery }), c.difficultQuestions);

router.get('/exams', validate({ query: v.listExamsQuery }), c.listExams);
router.post('/exams', validate({ body: v.examBody }), c.createExam);
router.get('/exams/:id', validate({ params: idParams }), c.getExam);
router.put('/exams/:id', validate({ params: idParams, body: v.examBody }), c.updateExam);
router.delete('/exams/:id', validate({ params: idParams }), c.deleteExam);
router.patch('/exams/:id/status', validate({ params: idParams, body: v.statusBody }), c.setStatus);
router.patch('/exams/:id/release-results', validate({ params: idParams, body: v.releaseBody }), c.releaseExamResults);
router.get('/exams/:id/attempts', validate({ params: idParams, query: paginationQuery }), c.examAttempts);

router.get('/attempts/:id', validate({ params: idParams }), c.attemptDetail);
router.patch('/attempts/:id/release', validate({ params: idParams, body: v.releaseBody }), c.releaseAttempt);

router.get('/students', validate({ query: v.listQuery }), c.students);

module.exports = router;
