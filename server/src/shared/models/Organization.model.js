'use strict';

const { Schema, model } = require('mongoose');

const organizationSchema = new Schema(
  {
    name:        { type: String, required: true, trim: true, maxlength: 80 },
    slug:        {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens'],
    },
    description: { type: String, maxlength: 500, default: '' },
    logoUrl:     { type: String, default: null },
    createdBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

organizationSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = model('Organization', organizationSchema);
