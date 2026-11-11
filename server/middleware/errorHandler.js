const { ZodError } = require('zod');
const mongoose = require('mongoose');
const env = require('../config/env');

const notFound = (req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}`, code: 'NOT_FOUND' });

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong';
  let code = err.code;
  let details = err.details;

  if (err instanceof ZodError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    message = details[0] ? `${details[0].path ? details[0].path + ': ' : ''}${details[0].message}` : 'Invalid input';
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    message = details[0]?.message || 'Invalid data';
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    code = 'INVALID_ID';
    message = 'Invalid identifier';
  } else if (err.code === 11000) {
    status = 409;
    code = 'DUPLICATE';
    message = 'A record with these details already exists';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body too large';
  } else if (err.message && err.message.startsWith('CORS')) {
    status = 403;
  } else if (!err.isOperational && !err.status) {
    status = 500;
  }

  if (status >= 500) {
    console.error('💥', err);
    if (env.isProd) message = 'Internal server error';
  }

  res.status(status).json({ message, ...(code && { code }), ...(details && { details }) });
};

module.exports = { notFound, errorHandler };
