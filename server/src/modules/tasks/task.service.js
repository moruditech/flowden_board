'use strict';

const mongoose   = require('mongoose');
const Task       = require('../../shared/models/Task.model');
const Board      = require('../../shared/models/Board.model');
const User       = require('../../shared/models/User.model');
const Membership = require('../../shared/models/Membership.model');
const AppError   = require('../../shared/utils/AppError');
const { positionBetween } = require('../../shared/utils/crypto');
const eventBus   = require('../../shared/events/eventBus');

async function getBoardAndAssertAccess(boardId, userId) {
  const board = await Board.findById(boardId);
  if (!board) throw AppError.notFound('Board');
  const m = await Membership.findOne({ user: userId, organization: board.organization }).lean();
  if (!m) throw AppError.forbidden('You are not a member of this organization');
  return { board, membership: m };
}

const taskService = {
  async create(boardId, { title, description, columnId, assigneeId, dueDate, labels }, actor) {
    const { board } = await getBoardAndAssertAccess(boardId, actor.id);

    const column = board.columns.find((c) => c._id.toString() === columnId);
    if (!column) throw AppError.badRequest(`Column "${columnId}" not found on this board`);

    const lastTask = await Task.findOne({ board: boardId, column: columnId })
      .sort({ position: -1 })
      .lean();
    const position = positionBetween(lastTask?.position ?? null, null);

    const task = await Task.create({
      board:       boardId,
      column:      new mongoose.Types.ObjectId(columnId),
      title,
      description: description || '',
      assignee:    assigneeId ? new mongoose.Types.ObjectId(assigneeId) : null,
      dueDate:     dueDate || null,
      labels:      labels || [],
      position,
      createdBy:   actor.id,
    });

    const result = task.toJSON();
    eventBus.emit('task.created', { task: result, board: board.toJSON(), actor });

    // Emit assignment event if assignee is set at creation
    if (assigneeId) {
      const assignee = await User.findById(assigneeId).lean();
      if (assignee) {
        eventBus.emit('task.assigned', {
          task:     result,
          board:    board.toJSON(),
          assignee,
          actor,
        });
      }
    }

    return result;
  },

  async listForBoard(boardId, userId) {
    await getBoardAndAssertAccess(boardId, userId);
    return Task.find({ board: boardId })
      .populate('assignee', 'name email avatarUrl')
      .populate('createdBy', 'name email avatarUrl')
      .sort({ column: 1, position: 1 })
      .lean();
  },

  async getById(taskId, userId) {
    const task = await Task.findById(taskId)
      .populate('assignee', 'name email avatarUrl')
      .populate('createdBy', 'name email avatarUrl');
    if (!task) throw AppError.notFound('Task');
    await getBoardAndAssertAccess(task.board.toString(), userId);
    return task.toJSON();
  },

  async update(taskId, changes, actor) {
    const task = await Task.findById(taskId);
    if (!task) throw AppError.notFound('Task');
    const { board } = await getBoardAndAssertAccess(task.board.toString(), actor.id);

    const validChanges = {};
    const prevAssigneeId = task.assignee?.toString();

    if (changes.title       !== undefined) { task.title       = changes.title;       validChanges.title       = changes.title; }
    if (changes.description !== undefined) { task.description = changes.description; validChanges.description = changes.description; }
    if (changes.dueDate     !== undefined) { task.dueDate     = changes.dueDate;     validChanges.dueDate     = changes.dueDate; }
    if (changes.labels      !== undefined) { task.labels      = changes.labels;      validChanges.labels      = changes.labels; }
    if (changes.assigneeId  !== undefined) {
      task.assignee          = changes.assigneeId ? new mongoose.Types.ObjectId(changes.assigneeId) : null;
      validChanges.assigneeId = changes.assigneeId;
    }

    await task.save();
    const result = task.toJSON();
    eventBus.emit('task.updated', { task: result, board: board.toJSON(), actor, changes: validChanges });

    // Emit task.assigned if assignee changed to a new person
    const newAssigneeId = changes.assigneeId;
    if (newAssigneeId && newAssigneeId !== prevAssigneeId) {
      const assignee = await User.findById(newAssigneeId).lean();
      if (assignee) {
        eventBus.emit('task.assigned', { task: result, board: board.toJSON(), assignee, actor });
      }
    }

    return result;
  },

  async move(taskId, { columnId, position }, actor) {
    const task = await Task.findById(taskId);
    if (!task) throw AppError.notFound('Task');
    const { board } = await getBoardAndAssertAccess(task.board.toString(), actor.id);

    const column = board.columns.find((c) => c._id.toString() === columnId);
    if (!column) throw AppError.badRequest(`Column "${columnId}" not found on this board`);

    const fromColumn    = task.column.toString();
    task.column         = new mongoose.Types.ObjectId(columnId);
    task.position       = position;
    await task.save();

    const result = task.toJSON();
    eventBus.emit('task.moved', {
      task: result,
      board: board.toJSON(),
      actor,
      fromColumn,
      toColumn: columnId,
    });

    return result;
  },

  async delete(taskId, actor) {
    const task = await Task.findById(taskId);
    if (!task) throw AppError.notFound('Task');
    const { board } = await getBoardAndAssertAccess(task.board.toString(), actor.id);

    await task.deleteOne();
    eventBus.emit('task.deleted', { taskId, board: board.toJSON(), actor });
  },
};

module.exports = taskService;
