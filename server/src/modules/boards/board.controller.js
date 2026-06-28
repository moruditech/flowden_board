'use strict';
const svc          = require('./board.service');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { success, created } = require('../../shared/utils/apiResponse');

const listBoards  = asyncHandler(async (req, res) => {
  const boards = await svc.listForOrg(req.params.orgId, req.user.id, req.query);
  success(res, { boards });
});
const createBoard = asyncHandler(async (req, res) => {
  const board = await svc.create(req.params.orgId, req.body, req.user);
  created(res, { board });
});
const getBoard    = asyncHandler(async (req, res) => {
  const board = await svc.getById(req.params.boardId, req.user.id);
  success(res, { board });
});
const updateBoard = asyncHandler(async (req, res) => {
  const board = await svc.update(req.params.boardId, req.body, req.user);
  success(res, { board });
});
const deleteBoard = asyncHandler(async (req, res) => {
  await svc.delete(req.params.boardId, req.user);
  success(res, { message: 'Board deleted' });
});

module.exports = { listBoards, createBoard, getBoard, updateBoard, deleteBoard };
