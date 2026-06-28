'use strict';

/**
 * Standardised API response helpers.
 * All responses follow the envelope:
 *   { success: true,  data: { ... }, meta?: { ... } }
 *   { success: false, error: { code, message, details? } }
 *
 * Error responses are handled by errorHandler middleware — not here.
 */

/**
 * Send a successful response.
 * @param {object} res         - Express response object
 * @param {*}      data        - Response payload
 * @param {number} statusCode  - HTTP status (default 200)
 * @param {object} meta        - Optional pagination / extra metadata
 */
const success = (res, data, statusCode = 200, meta = null) => {
  const payload = { success: true, data };
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
};

/**
 * Send a 201 Created response.
 */
const created = (res, data, meta = null) => success(res, data, 201, meta);

/**
 * Send a 204 No Content response (no body).
 */
const noContent = (res) => res.status(204).send();

module.exports = { success, created, noContent };
