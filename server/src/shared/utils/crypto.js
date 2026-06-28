'use strict';

const { randomBytes, createHash } = require('crypto');

/**
 * Generate a cryptographically secure random token.
 * Returns a hex string (default 48 bytes = 96 hex chars).
 */
function generateToken(bytes = 48) {
  return randomBytes(bytes).toString('hex');
}

/**
 * Hash a raw token with SHA-256 for storage.
 * Never store raw tokens — store the hash and compare on receipt.
 */
function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Fractional indexing — compute a position between two existing positions.
 * Used for O(1) task reordering without renumbering every row.
 *
 * @param {number|null} before  - Position of the card above, or null if prepending
 * @param {number|null} after   - Position of the card below, or null if appending
 * @returns {number}            - New fractional position
 *
 * Examples:
 *   positionBetween(null, null) → 1000        (first card)
 *   positionBetween(null, 1000) → 500         (prepend before first)
 *   positionBetween(1000, null) → 2000        (append after last)
 *   positionBetween(1000, 2000) → 1500        (insert between two)
 */
function positionBetween(before, after) {
  if (before == null && after == null) return 1000;
  if (before == null) return after / 2;
  if (after  == null) return before + 1000;
  return (before + after) / 2;
}

module.exports = { generateToken, hashToken, positionBetween };
