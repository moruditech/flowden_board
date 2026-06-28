'use strict';
const Joi = require('joi');

const createTask = Joi.object({
  title:       Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().max(5000).allow('').optional(),
  columnId:    Joi.string().required(),
  assigneeId:  Joi.string().allow(null, '').optional(),
  dueDate:     Joi.date().iso().allow(null).optional(),
  labels:      Joi.array().items(Joi.string().trim().max(30)).max(10).default([]),
});

const updateTask = Joi.object({
  title:       Joi.string().trim().min(1).max(200),
  description: Joi.string().max(5000).allow(''),
  assigneeId:  Joi.string().allow(null, ''),
  dueDate:     Joi.date().iso().allow(null),
  labels:      Joi.array().items(Joi.string().trim().max(30)).max(10),
}).min(1);

const moveTask = Joi.object({
  columnId: Joi.string().required(),
  position: Joi.number().required(),
});

module.exports = { createTask, updateTask, moveTask };
