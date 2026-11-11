const router = require('express').Router();
const c = require('../controllers/candidateController');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const v = require('../validators/exam');
const { idParams, paginationQuery } = require('../validators/common');

router.use(protect, authorize('candidate'));

router.get('/dashboard', c.dashboard);
router.get('/exams', validate({ query: v.listQuery }), c.listExams);
router.get('/exams/:id', validate({ params: idParams }), c.getExam);
router.post('/exams/:id/start', validate({ params: idParams }), c.startExam);

router.get('/attempts/:id', validate({ params: idParams }), c.getAttempt);
router.put('/attempts/:id/answers', validate({ params: idParams, body: v.saveAnswersBody }), c.saveAnswers);
router.post('/attempts/:id/submit', validate({ params: idParams, body: v.submitBody }), c.submit);

router.get('/results', validate({ query: paginationQuery }), c.listResults);
router.get('/results/:id', validate({ params: idParams }), c.getResult);

module.exports = router;
