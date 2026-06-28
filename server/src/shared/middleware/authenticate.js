'use strict';

const { verifyAccessToken } = require('../utils/jwt');
const AppError              = require('../utils/AppError');

/**
 * Middleware: authenticate
 *
 * Reads the Authorization header, verifies the Bearer JWT,
 * and attaches req.user = { id, email } for downstream handlers.
 *
 * Returns 401 if the header is missing, malformed, expired, or invalid.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('No access token provided. Include Authorization: Bearer <token>'));
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(AppError.unauthorized('Access token has expired — please refresh your session'));
    }
    return next(AppError.unauthorized('Invalid access token'));
  }
}

module.exports = authenticate;
