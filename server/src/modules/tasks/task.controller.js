'use strict';
const svc          = require('./task.service');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { success, created } = require('../../shared/utils/apiResponse');

const listTasks   = asyncHandler(async (req, res) => {
  const tasks = await svc.listForBoard(req.params.boardId, req.user.id);
  success(res, { tasks });
});
const createTask  = asyncHandler(async (req, res) => {
  const task = await svc.create(req.params.boardId, req.body, req.user);
  created(res, { task });
});
const getTask     = asyncHandler(async (req, res) => {
  const task = await svc.getById(req.params.taskId, req.user.id);
  success(res, { task });
});
const updateTask  = asyncHandler(async (req, res) => {
  const task = await svc.update(req.params.taskId, req.body, req.user);
  success(res, { task });
});
const moveTask    = asyncHandler(async (req, res) => {
  const task = await svc.move(req.params.taskId, req.body, req.user);
  success(res, { task });
});
const deleteTask  = asyncHandler(async (req, res) => {
  await svc.delete(req.params.taskId, req.user);
  success(res, { message: 'Task deleted' });
});

module.exports = { listTasks, createTask, getTask, updateTask, moveTask, deleteTask };
