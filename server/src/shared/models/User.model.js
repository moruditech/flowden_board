'use strict';

const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    name:  { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
      index:     true,
    },
    passwordHash: { type: String, required: true, select: false },
    avatarUrl:    { type: String, default: null },
    isActive:     { type: Boolean, default: true },

    // ── Email verification ──────────────────────────────────────────────────
    emailVerified:             { type: Boolean,  default: false },
    emailVerificationToken:    { type: String,   default: null, select: false },
    emailVerificationExpires:  { type: Date,     default: null },

    // ── Password reset ──────────────────────────────────────────────────────
    passwordResetToken:   { type: String, default: null, select: false },
    passwordResetExpires: { type: Date,   default: null },
  },
  { timestamps: true }
);

// ── toJSON transform ──────────────────────────────────────────────────────────
userSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    delete ret.emailVerificationToken;
    delete ret.emailVerificationExpires;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    return ret;
  },
});

module.exports = model('User', userSchema);
