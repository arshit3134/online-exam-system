const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { setAuthCookie, clearAuthCookie } = require('../utils/token');

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw new ApiError(409, 'An account with this email already exists', { code: 'EMAIL_TAKEN' });
  const user = await User.create({ name, email, password, role: 'candidate' });
  setAuthCookie(res, user);
  res.status(201).json({ data: { user: user.toPublic() } });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password, portal } = req.body;
  const user = await User.findOne({ email }).select('+password');
  const ok = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
  if (!user || !ok) throw new ApiError(401, 'Invalid email or password', { code: 'INVALID_CREDENTIALS' });

  if (portal && user.role !== portal) {
    const message =
      portal === 'teacher'
        ? 'This is a student account. Please use the student login.'
        : 'This is a teacher account. Please use the teacher login.';
    throw new ApiError(403, message, { code: 'WRONG_PORTAL' });
  }
  setAuthCookie(res, user);
  res.json({ data: { user: user.toPublic() } });
});

exports.logout = (req, res) => {
  clearAuthCookie(res);
  res.json({ data: { message: 'Signed out' } });
};

exports.me = (req, res) => res.json({ data: { user: req.user.toPublic() } });
