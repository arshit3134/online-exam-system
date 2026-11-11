const ApiError = require('../utils/ApiError');

// Cookies are SameSite=None in cross-site deployments, so require a custom header on every
// state-changing request. Browsers cannot send it cross-origin without a CORS preflight,
// which our strict CORS policy rejects for foreign origins.
module.exports = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-requested-with') !== 'XMLHttpRequest') {
    return next(new ApiError(403, 'Missing required request header', { code: 'CSRF' }));
  }
  next();
};
