const jwt = require('jsonwebtoken');
const env = require('../config/env');

const COOKIE_NAME = 'exam_token';
const MAX_AGE_MS = env.JWT_EXPIRES_DAYS * 24 * 60 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd || env.cookieSameSite === 'none',
  sameSite: env.cookieSameSite,
  path: '/',
});

const signToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, env.JWT_SECRET, {
    expiresIn: `${env.JWT_EXPIRES_DAYS}d`,
  });

const verifyToken = (token) => jwt.verify(token, env.JWT_SECRET);

const setAuthCookie = (res, user) =>
  res.cookie(COOKIE_NAME, signToken(user), { ...cookieOptions(), maxAge: MAX_AGE_MS });

const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, cookieOptions());

module.exports = { COOKIE_NAME, setAuthCookie, clearAuthCookie, verifyToken };
