const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const base = { standardHeaders: true, legacyHeaders: false, skip: () => env.isTest };

exports.apiLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  max: 400,
  message: { message: 'Too many requests, please slow down.', code: 'RATE_LIMITED' },
});

exports.authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many attempts. Please try again in a few minutes.', code: 'RATE_LIMITED' },
});
