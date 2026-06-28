'use strict';
const Joi = require('joi');

const updateProfile = Joi.object({
  name:      Joi.string().trim().min(2).max(60),
  avatarUrl: Joi.string().uri().allow(null, ''),
}).min(1);

const changePassword = Joi.object({
  currentPassword: Joi.string().min(1).required(),
  newPassword: Joi.string().min(8).max(128)
    .pattern(/[A-Z]/, 'uppercase letter')
    .pattern(/[0-9]/, 'number')
    .messages({ 'string.pattern.name': 'New password must contain at least one {#name}' })
    .required(),
});

module.exports = { updateProfile, changePassword };
