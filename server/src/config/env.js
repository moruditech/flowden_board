'use strict';

require('dotenv').config();

/**
 * Read an environment variable.
 * If no default is provided the variable is required — throws on missing.
 */
function get(key, defaultValue) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(
      `[env] Missing required environment variable: "${key}"\n` +
      `      Copy .env.example to .env and fill in the value.`
    );
  }
  return value;
}

const env = Object.freeze({
  // ── Server ────────────────────────────────────────────────────────────────
  NODE_ENV:   get('NODE_ENV', 'development'),
  PORT:       parseInt(get('PORT', '5000'), 10),

  // ── MongoDB ───────────────────────────────────────────────────────────────
  MONGO_URI:  get('MONGO_URI', 'mongodb://localhost:27017/teamworkspace'),

  // ── Redis ─────────────────────────────────────────────────────────────────
  REDIS_HOST:     get('REDIS_HOST', '127.0.0.1'),
  REDIS_PORT:     parseInt(get('REDIS_PORT', '6379'), 10),
  REDIS_PASSWORD: get('REDIS_PASSWORD', ''),
  BULL_REDIS_DB:  parseInt(get('BULL_REDIS_DB', '1'), 10),

  // ── JWT ───────────────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET:  get('JWT_ACCESS_SECRET', 'dev-access-secret-must-be-32-chars!!'),
  JWT_REFRESH_SECRET: get('JWT_REFRESH_SECRET', 'dev-refresh-secret-must-be-32-chars!'),
  JWT_ACCESS_EXPIRES: get('JWT_ACCESS_EXPIRES', '15m'),
  JWT_REFRESH_EXPIRES:get('JWT_REFRESH_EXPIRES', '7d'),

  // ── Client ────────────────────────────────────────────────────────────────
  CLIENT_URL: get('CLIENT_URL', 'http://localhost:5173'),

  // ── Email ─────────────────────────────────────────────────────────────────
  SMTP_HOST:      get('SMTP_HOST', 'smtp.mailtrap.io'),
  SMTP_PORT:      parseInt(get('SMTP_PORT', '587'), 10),
  SMTP_USER:      get('SMTP_USER', ''),
  SMTP_PASS:      get('SMTP_PASS', ''),
  EMAIL_FROM:     get('EMAIL_FROM', 'noreply@teamworkspace.dev'),
  EMAIL_FROM_NAME:get('EMAIL_FROM_NAME', 'Team Workspace'),

  // ── Rate limiting ─────────────────────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS:  parseInt(get('RATE_LIMIT_WINDOW_MS', '900000'), 10),
  RATE_LIMIT_MAX:        parseInt(get('RATE_LIMIT_MAX', '200'), 10),
  AUTH_RATE_LIMIT_MAX:   parseInt(get('AUTH_RATE_LIMIT_MAX', '10'), 10),

  // ── Helpers ───────────────────────────────────────────────────────────────
  isProduction()  { return this.NODE_ENV === 'production';  },
  isDevelopment() { return this.NODE_ENV === 'development'; },
  isTest()        { return this.NODE_ENV === 'test';        },
});

module.exports = env;
