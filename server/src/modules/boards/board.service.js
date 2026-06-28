'use strict';

const mongoose   = require('mongoose');
const Board      = require('../../shared/models/Board.model');
const Task       = require('../../shared/models/Task.model');
const Membership = require('../../shared/models/Membership.model');
const AppError   = require('../../shared/utils/AppError');
const eventBus   = require('../../shared/events/eventBus');

async function assertMember(userId, orgId) {
  const m = await Membership.findOne({ user: userId, organization: orgId }).lean();
  if (!m) throw AppError.forbidden('You are not a member of this organization');
  return m;
}

async function getBoardAndAssertAccess(boardId, userId) {
  const board = await Board.findById(boardId);
  if (!board) throw AppError.notFound('Board');
  const m = await assertMember(userId, board.organization.toString());
  return { board, membership: m };
}

const boardService = {
  async create(orgId, { name, description, columns }, actor) {
    await assertMember(actor.id, orgId);

    const cols = columns.map((c, i) => ({
      _id:   new mongoose.Types.ObjectId(),
      name:  c.name,
      order: i,
    }));

    const board = await Board.create({
      organization: orgId,
      name,
      description: description || '',
      columns:     cols,
      createdBy:   actor.id,
    });

    const result = board.toJSON();
    eventBus.emit('board.created', { board: result, orgId, actor });
    return result;
  },

  async listForOrg(orgId, userId, { includeArchived = false } = {}) {
    await assertMember(userId, orgId);
    const filter = { organization: orgId };
    if (!includeArchived) filter.isArchived = false;

    return Board.find(filter)
      .populate('createdBy', 'name email avatarUrl')
      .sort({ createdAt: -1 })
      .lean();
  },

  async getById(boardId, userId) {
    const { board } = await getBoardAndAssertAccess(boardId, userId);
    return board.toJSON();
  },

  async update(boardId, changes, actor) {
    const { board, membership } = await getBoardAndAssertAccess(boardId, actor.id);

    if (membership.role === 'member' && changes.columns) {
      throw AppError.forbidden('Members cannot modify board columns');
    }

    if (changes.name        !== undefined) board.name        = changes.name;
    if (changes.description !== undefined) board.description = changes.description;
    if (changes.isArchived  !== undefined) board.isArchived  = changes.isArchived;

    if (changes.columns) {
      board.columns = changes.columns.map((c, i) => ({
        _id:   c._id ? new mongoose.Types.ObjectId(c._id) : new mongoose.Types.ObjectId(),
        name:  c.name,
        order: c.order ?? i,
      }));
    }

    await board.save();
    const result = board.toJSON();
    eventBus.emit('board.updated', { board: result, orgId: board.organization.toString(), actor, changes });
    return result;
  },

  async delete(boardId, actor) {
    const { board, membership } = await getBoardAndAssertAccess(boardId, actor.id);

    if (membership.role === 'member') {
      throw AppError.forbidden('Only admins and owners can delete boards');
    }

    await Task.deleteMany({ board: boardId });
    const orgId = board.organization.toString();
    await board.deleteOne();

    eventBus.emit('board.deleted', { boardId, orgId, actor });
  },
};

module.exports = boardService;
