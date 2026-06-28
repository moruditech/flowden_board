'use strict';

const { Schema, model } = require('mongoose');

const taskSchema = new Schema(
  {
    board:       { type: Schema.Types.ObjectId, ref: 'Board', required: true },
    // column references Board.columns._id (a subdoc ObjectId — not a separate collection)
    column:      { type: Schema.Types.ObjectId, required: true },
    title:       { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 5000, default: '' },
    assignee:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
    // Fractional index — allows O(1) reordering without renumbering every row
    position:    { type: Number, required: true },
    labels:      { type: [String], default: [] },
    dueDate:     { type: Date, default: null },
    createdBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Primary read pattern: render all tasks for a board, sorted by column then position
taskSchema.index({ board: 1, column: 1, position: 1 });

taskSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = model('Task', taskSchema);
