'use strict';
const Joi = require('joi');

const createInvite = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  role:  Joi.string().valid('admin', 'member').required(),
});

const acceptInvite = Joi.object({
  token: Joi.string().min(1).required(),
});

module.exports = { createInvite, acceptInvite };
