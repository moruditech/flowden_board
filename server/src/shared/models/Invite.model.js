'use strict';

const { Schema, model } = require('mongoose');

/**
 * We store the SHA-256 hash of the raw invite token, never the raw value.
 * The TTL index auto-purges expired (never-accepted) invites.
 * Accepted invites have their acceptedAt set and are purged by the cleanup worker.
 */
const inviteSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    email:        { type: String, required: true, lowercase: true, trim: true },
    role:         { type: String, enum: ['admin', 'member'], required: true },
    tokenHash:    { type: String, required: true, unique: true, select: false },
    invitedBy:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt:    { type: Date, required: true },
    acceptedAt:   { type: Date, default: null },
  },
  { timestamps: true }
);

// Find pending invites for a given org + email
inviteSchema.index({ organization: 1, email: 1 });

// Auto-delete expired, unaccepted invites
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

inviteSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.tokenHash;
    return ret;
  },
});

module.exports = model('Invite', inviteSchema);
