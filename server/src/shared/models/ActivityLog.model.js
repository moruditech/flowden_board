'use strict';

const { Schema, model } = require('mongoose');

/**
 * Append-only log of every significant event in an organization.
 * Never updated after creation — only inserted and read.
 * No updatedAt timestamp needed.
 */
const activityLogSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    board:        { type: Schema.Types.ObjectId, ref: 'Board', default: null },
    actor:        { type: Schema.Types.ObjectId, ref: 'User',  required: true },
    action:       { type: String, required: true },
    metadata:     { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Primary query: activity feed for an org, newest first
activityLogSchema.index({ organization: 1, createdAt: -1 });

// Secondary query: board-specific activity
activityLogSchema.index({ board: 1, createdAt: -1 });

activityLogSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = model('ActivityLog', activityLogSchema);
