const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { COOKIE_NAME, verifyToken } = require('../utils/token');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) throw new ApiError(401, 'Authentication required', { code: 'UNAUTHENTICATED' });

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new ApiError(401, 'Your session has expired. Please sign in again.', { code: 'SESSION_EXPIRED' });
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'Account no longer exists', { code: 'UNAUTHENTICATED' });
  req.user = user;
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, 'You do not have permission to perform this action', { code: 'FORBIDDEN' }));
  }
  next();
};

module.exports = { protect, authorize };
