'use strict';

const AppError = require('../utils/AppError');
const logger   = require('../utils/logger');

/**
 * Middleware: errorHandler
 *
 * Global Express error handler — must be the LAST middleware in app.js.
 * Express identifies it as an error handler because it takes 4 arguments.
 *
 * Handles:
 *   - AppError (operational errors — bad request, not found, etc.)
 *   - Mongoose ValidationError
 *   - Mongoose CastError (invalid ObjectId)
 *   - Mongoose duplicate key error (code 11000)
 *   - JWT errors (malformed token)
 *   - Unknown / programmer errors (logged as error, 500 returned)
 *
 * All responses follow the envelope:
 *   { success: false, error: { code, message, details? } }
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {

  // ── Mongoose duplicate key ────────────────────────────────────────────────
  if (err.code === 11000) {
    const field   = Object.keys(err.keyValue || {})[0] || 'field';
    const value   = err.keyValue?.[field] || '';
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: `${field} '${value}' already exists` },
    });
  }

  // ── Mongoose validation error ──────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }));
    return res.status(422).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
    });
  }

  // ── Mongoose cast error (invalid ObjectId) ────────────────────────────────
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_ID', message: `Invalid value for field '${err.path}'` },
    });
  }

  // ── JWT errors (caught here if verifyAccessToken is called outside middleware)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token has expired' },
    });
  }

  // ── Known operational errors (AppError instances) ─────────────────────────
  if (err instanceof AppError || err.isOperational) {
    // Log server errors but not 4xx (those are the client's fault)
    if (err.statusCode >= 500) {
      logger.error(`[${err.errorCode}] ${err.message}`, { stack: err.stack });
    }

    return res.status(err.statusCode || 500).json({
      success: false,
      error: {
        code:    err.errorCode || 'ERROR',
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  // ── Unknown / programmer errors ───────────────────────────────────────────
  // Log the full stack — this should never happen in a well-tested app
  logger.error('Unhandled error:', {
    message: err.message,
    stack:   err.stack,
    url:     req.originalUrl,
    method:  req.method,
  });

  // Never expose internal error details to the client in production
  res.status(500).json({
    success: false,
    error: {
      code:    'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
    },
  });
}

module.exports = errorHandler;
