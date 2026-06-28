'use strict';
const Joi = require('joi');

const createOrg = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  slug: Joi.string().trim().lowercase().min(2).max(40)
    .pattern(/^[a-z0-9-]+$/, 'slug format')
    .messages({ 'string.pattern.name': 'Slug may only contain lowercase letters, numbers, and hyphens' })
    .required(),
  description: Joi.string().max(500).allow('').optional(),
});

const updateOrg = Joi.object({
  name:        Joi.string().trim().min(2).max(80),
  description: Joi.string().max(500).allow(''),
}).min(1);

const updateMemberRole = Joi.object({
  role: Joi.string().valid('admin', 'member').required(),
});

module.exports = { createOrg, updateOrg, updateMemberRole };
