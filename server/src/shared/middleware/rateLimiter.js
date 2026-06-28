'use strict';

const rateLimit = require('express-rate-limit');
const env       = require('../../config/env');

/**
 * Standard rate limit response body — same shape as other API errors.
 */
const rateLimitResponse = (message) => ({
  success: false,
  error: {
    code:    'RATE_LIMIT_EXCEEDED',
    message,
  },
});

/**
 * globalLimiter — applied to all routes via app.js.
 * 200 requests per 15 minutes per IP by default.
 * Skipped in test environment so tests don't need to worry about it.
 */
const globalLimiter = rateLimit({
  windowMs:        env.RATE_LIMIT_WINDOW_MS,
  max:             env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            () => env.isTest(),
  handler(req, res) {
    res.status(429).json(
      rateLimitResponse('Too many requests — please slow down and try again later.')
    );
  },
});

/**
 * authLimiter — applied only to auth endpoints (register, login, forgot-password).
 * Stricter: 10 requests per 15 minutes per IP.
 * Prevents credential-stuffing and brute-force attacks.
 */
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            () => env.isTest(),
  handler(req, res) {
    res.status(429).json(
      rateLimitResponse('Too many auth attempts — please wait 15 minutes before trying again.')
    );
  },
});

module.exports = { globalLimiter, authLimiter };
