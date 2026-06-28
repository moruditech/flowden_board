'use strict';

const logger = require('../utils/logger');

/**
 * Middleware: requestLogger
 *
 * Logs every HTTP request/response in a structured format.
 * Used in production. In development, morgan handles request logging
 * with a human-readable format (configured in app.js).
 *
 * Log fields:
 *   method    - HTTP verb
 *   url       - Full URL including query string
 *   status    - Response status code
 *   duration  - Time from request start to response finish (ms)
 *   ip        - Client IP (respects X-Forwarded-For with trust proxy)
 *   userAgent - Client user-agent string
 *   userId    - Authenticated user ID (if available)
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level    = res.statusCode >= 500 ? 'error'
                   : res.statusCode >= 400 ? 'warn'
                   : 'info';

    logger[level]({
      method:    req.method,
      url:       req.originalUrl,
      status:    res.statusCode,
      duration:  `${duration}ms`,
      ip:        req.ip,
      userAgent: req.get('user-agent') || '',
      userId:    req.user?.id || null,
    });
  });

  next();
}

module.exports = requestLogger;
