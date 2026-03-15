/**
 * Response Helper for Vercel API Routes
 * Standardized response formatting
 */

/**
 * Send error response
 */
export function sendError(res, statusCode, error, message) {
  return res.status(statusCode).json({
    error,
    message,
  });
}

/**
 * Send validation error response
 */
export function sendValidationError(res, errors = []) {
  return res.status(400).json({
    error: 'ValidationError',
    message: 'Request validation failed',
    errors,
  });
}

/**
 * Send unauthorized response
 */
export function sendUnauthorized(res, message = 'Unauthorized') {
  return res.status(401).json({
    error: 'Unauthorized',
    message,
  });
}

/**
 * Send forbidden response
 */
export function sendForbidden(res, message = 'Forbidden') {
  return res.status(403).json({
    error: 'Forbidden',
    message,
  });
}

/**
 * Send not found response
 */
export function sendNotFound(res, message = 'Not found') {
  return res.status(404).json({
    error: 'NotFound',
    message,
  });
}

/**
 * Send internal error response
 */
export function sendInternalError(res, message = 'Internal server error') {
  return res.status(500).json({
    error: 'InternalError',
    message,
  });
}

/**
 * Send success response
 */
export function sendSuccess(res, data = {}, statusCode = 200) {
  return res.status(statusCode).json(data);
}

export default {
  sendError,
  sendValidationError,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendInternalError,
  sendSuccess,
};
