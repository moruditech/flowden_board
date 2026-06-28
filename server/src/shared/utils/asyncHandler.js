'use strict';

/**
 * Wraps an async Express route handler so that any rejected promise
 * is automatically forwarded to Express's next(err) error handler.
 *
 * Without this, async errors in route handlers would cause unhandled
 * promise rejections and the request would hang.
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
