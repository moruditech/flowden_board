'use strict';

const { Schema, model } = require('mongoose');

/**
 * Columns are embedded as a subdocument array.
 * Rationale: columns are always small in number (<= 10), always read
 * together with the board, and never queried independently.
 * Embedding avoids an extra collection and a join.
 */
const columnSchema = new Schema(
  {
    name:  { type: String, required: true, trim: true, maxlength: 50 },
    order: { type: Number, required: true },
  },
  { _id: true } // Keep _id so tasks can reference a column by its ObjectId
);

const boardSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name:         { type: String, required: true, trim: true, maxlength: 100 },
    description:  { type: String, maxlength: 500, default: '' },
    columns:      { type: [columnSchema], default: [] },
    createdBy:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isArchived:   { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Primary list query: boards for an org, non-archived, newest first
boardSchema.index({ organization: 1, isArchived: 1, createdAt: -1 });

boardSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = model('Board', boardSchema);
