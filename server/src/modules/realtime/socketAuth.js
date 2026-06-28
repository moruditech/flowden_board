'use strict';

const { verifyAccessToken } = require('../../shared/utils/jwt');
const logger = require('../../shared/utils/logger');

/**
 * Socket.io authentication middleware.
 * Reads the JWT from socket.handshake.auth.token.
 * On success: attaches socket.data.user = { id, email }
 * On failure: disconnects with an auth error event.
 */
function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('AUTH_REQUIRED: No token provided'));
  }

  try {
    const payload    = verifyAccessToken(token);
    socket.data.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'AUTH_EXPIRED: Access token has expired'
      : 'AUTH_INVALID: Invalid access token';
    logger.debug(`[SOCKET] Auth failed for ${socket.id}: ${msg}`);
    next(new Error(msg));
  }
}

module.exports = socketAuth;
