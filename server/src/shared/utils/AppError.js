'use strict';

/**
 * AppError — all intentional API errors should be instances of this class.
 * The global errorHandler checks `err.isOperational` to distinguish between
 * programmer errors (bugs) and known operational errors (bad request, etc.).
 */
class AppError extends Error {
  /**
   * @param {string} message    - Human-readable message sent to the client
   * @param {number} statusCode - HTTP status code
   * @param {string} errorCode  - Machine-readable code (e.g. 'NOT_FOUND')
   * @param {*}      details    - Optional structured details (e.g. validation errors)
   */
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name          = 'AppError';
    this.statusCode    = statusCode;
    this.errorCode     = errorCode;
    this.details       = details;
    this.isOperational = true;

    // Maintains proper prototype chain for `instanceof` checks after transpilation
    Object.setPrototypeOf(this, new.target.prototype);

    // Omit this constructor from the stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── Factory shortcuts ─────────────────────────────────────────────────────────

AppError.badRequest = (message = 'Bad request', details = null) =>
  new AppError(message, 400, 'BAD_REQUEST', details);

AppError.unauthorized = (message = 'Authentication required') =>
  new AppError(message, 401, 'UNAUTHORIZED');

AppError.forbidden = (message = 'You do not have permission to perform this action') =>
  new AppError(message, 403, 'FORBIDDEN');

AppError.notFound = (resource = 'Resource') =>
  new AppError(`${resource} not found`, 404, 'NOT_FOUND');

AppError.conflict = (message) =>
  new AppError(message, 409, 'CONFLICT');

AppError.validation = (message = 'Validation failed', details = null) =>
  new AppError(message, 422, 'VALIDATION_ERROR', details);

AppError.tooMany = (message = 'Too many requests — please try again later') =>
  new AppError(message, 429, 'RATE_LIMIT_EXCEEDED');

AppError.internal = (message = 'An unexpected error occurred') =>
  new AppError(message, 500, 'INTERNAL_ERROR');

module.exports = AppError;
