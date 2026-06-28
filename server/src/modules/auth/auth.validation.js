'use strict';

const Joi = require('joi');

const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[A-Z]/, 'uppercase letter')
  .pattern(/[0-9]/, 'number')
  .messages({
    'string.min':          'Password must be at least 8 characters',
    'string.pattern.name': 'Password must contain at least one {#name}',
  });

const register = Joi.object({
  name:     Joi.string().trim().min(2).max(60).required(),
  email:    Joi.string().email().lowercase().trim().required(),
  password: passwordSchema.required(),
});

const login = Joi.object({
  email:    Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(1).required(),
});

const forgotPassword = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
});

const resetPassword = Joi.object({
  token:       Joi.string().min(1).required(),
  newPassword: passwordSchema.required(),
});

const verifyEmail = Joi.object({
  token: Joi.string().min(1).required(),
});

const changePassword = Joi.object({
  currentPassword: Joi.string().min(1).required(),
  newPassword:     passwordSchema.required(),
});

module.exports = { register, login, forgotPassword, resetPassword, verifyEmail, changePassword };
