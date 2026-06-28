'use strict';

const jwt = require('jsonwebtoken');
const env = require('../../config/env');

/**
 * Sign an access token.
 * Payload should contain { sub: userId, email }.
 */
function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
  });
}

/**
 * Sign a refresh token.
 * Payload should contain { sub: userId, jti: refreshTokenDocId }.
 */
function signRefreshToken(payload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES,
  });
}

/**
 * Verify an access token.
 * Throws JsonWebTokenError / TokenExpiredError on failure.
 */
function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

/**
 * Verify a refresh token.
 * Throws JsonWebTokenError / TokenExpiredError on failure.
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

/**
 * Decode a token without verifying the signature.
 * Safe to use on expired tokens to extract the jti for logout.
 */
function decodeToken(token) {
  return jwt.decode(token);
}

/**
 * Returns the access token TTL in milliseconds.
 * Used to tell the client when to schedule a silent refresh.
 */
function getAccessTtlMs() {
  const str  = env.JWT_ACCESS_EXPIRES;
  const unit = str.slice(-1);
  const val  = parseInt(str, 10);
  const map  = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return val * (map[unit] || 60_000);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  getAccessTtlMs,
};
