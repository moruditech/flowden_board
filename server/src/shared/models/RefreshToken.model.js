'use strict';

const { Schema, model } = require('mongoose');

/**
 * One RefreshToken document per session (one per device/login).
 * We store the SHA-256 hash of the raw token, never the raw value.
 * The TTL index auto-deletes expired documents — no cron job needed.
 */
const refreshTokenSchema = new Schema(
  {
    user:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    expiresAt: { type: Date,   required: true },
    userAgent: { type: String, default: '' },
    ip:        { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Auto-delete documents when expiresAt is reached
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model('RefreshToken', refreshTokenSchema);
