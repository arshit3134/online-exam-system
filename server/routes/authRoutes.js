const router = require('express').Router();
const c = require('../controllers/authController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { registerBody, loginBody } = require('../validators/auth');

router.post('/register', authLimiter, validate({ body: registerBody }), c.register);
router.post('/login', authLimiter, validate({ body: loginBody }), c.login);
router.post('/logout', c.logout);
router.get('/me', protect, c.me);

module.exports = router;
