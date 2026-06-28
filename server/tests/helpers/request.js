'use strict';

const request   = require('supertest');
const createApp = require('../../app');

// Create one app instance shared across all tests in the suite
const app = createApp();

/**
 * Returns an Authorization header object for a given access token.
 * Usage: await api.get('/path').set(authHeader(token))
 */
function authHeader(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

/**
 * Pre-bound supertest agent for convenience.
 * Usage: await api.get('/api/v1/auth/me').set(authHeader(token))
 */
const api = request(app);

module.exports = { api, authHeader };
