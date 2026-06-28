'use strict';
const Joi = require('joi');

const columnItem = Joi.object({
  _id:   Joi.string().optional(),
  name:  Joi.string().trim().min(1).max(50).required(),
  order: Joi.number().integer().min(0).required(),
});

const createBoard = Joi.object({
  name:        Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().max(500).allow('').optional(),
  columns: Joi.array()
    .items(Joi.object({ name: Joi.string().trim().min(1).max(50).required() }))
    .min(1).max(10)
    .default([{ name: 'To Do' }, { name: 'In Progress' }, { name: 'Done' }]),
});

const updateBoard = Joi.object({
  name:        Joi.string().trim().min(1).max(100),
  description: Joi.string().max(500).allow(''),
  columns:     Joi.array().items(columnItem).min(1).max(10),
  isArchived:  Joi.boolean(),
}).min(1);

module.exports = { createBoard, updateBoard };
