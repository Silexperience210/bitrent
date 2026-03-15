import config from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  const isDev = config.isDevelopment();

  console.error('Error:', {
    message: err.message,
    stack: isDev ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    ...(isDev && { stack: err.stack }),
  });
};

export const notFound = (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
  });
};

export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default {
  errorHandler,
  notFound,
  AppError,
};
