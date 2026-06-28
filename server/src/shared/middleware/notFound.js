'use strict';

/**
 * Middleware: notFound
 *
 * Catches any request that didn't match a registered route.
 * Must be registered AFTER all route definitions in app.js.
 * Must be registered BEFORE the errorHandler.
 */
function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code:    'NOT_FOUND',
      message: `Route ${req.method} ${req.path} does not exist`,
    },
  });
}

module.exports = notFound;
