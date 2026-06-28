'use strict';

const { Schema, model } = require('mongoose');

/**
 * Source of truth for "who can do what in which organization".
 * The authorize() middleware queries this on every protected request.
 */
const membershipSchema = new Schema(
  {
    user:         { type: Schema.Types.ObjectId, ref: 'User',         required: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    role:         { type: String, enum: ['owner', 'admin', 'member'], required: true },
  },
  { timestamps: true }
);

// Ensures a user can only have one role per organization
membershipSchema.index({ user: 1, organization: 1 }, { unique: true });

// Optimises queries like "list all admins in org X"
membershipSchema.index({ organization: 1, role: 1 });

membershipSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = model('Membership', membershipSchema);
