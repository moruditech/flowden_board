'use strict';

const Membership = require('../../../shared/models/Membership.model');
const Board      = require('../../../shared/models/Board.model');
const eventBus   = require('../../../shared/events/eventBus');
const logger     = require('../../../shared/utils/logger');

/**
 * registerBoardHandler
 *
 * Called once per connected socket. Registers client event handlers
 * (board:join, board:leave) and subscribes to domain events on the
 * eventBus so they are broadcast to the correct board room.
 *
 * The io instance is needed to emit to rooms.
 */
function registerBoardHandler(io, socket) {
  // ── Client → Server: join a board room ─────────────────────────────────
  socket.on('board:join', async (boardId) => {
    try {
      const board = await Board.findById(boardId).select('organization').lean();
      if (!board) return;

      const membership = await Membership.findOne({
        user:         socket.data.user.id,
        organization: board.organization,
      }).lean();

      if (!membership) {
        logger.warn(`[SOCKET] ${socket.id} tried to join board ${boardId} — not a member`);
        return;
      }

      await socket.join(`board:${boardId}`);
      logger.debug(`[SOCKET] ${socket.id} (${socket.data.user.email}) joined board:${boardId}`);
    } catch (err) {
      logger.error(`[SOCKET] board:join error: ${err.message}`);
    }
  });

  // ── Client → Server: leave a board room ────────────────────────────────
  socket.on('board:leave', async (boardId) => {
    await socket.leave(`board:${boardId}`);
    logger.debug(`[SOCKET] ${socket.id} left board:${boardId}`);
  });
}

/**
 * registerEventBridges
 *
 * Called ONCE when the socket server starts (not per-socket).
 * Bridges domain eventBus events → Socket.io room broadcasts.
 *
 * Only called once to avoid duplicate broadcasts across multiple
 * connections. This is the sole file responsible for emitting
 * real-time events to clients.
 */
function registerEventBridges(io) {
  eventBus.on('task.created', ({ task, board }) => {
    io.to(`board:${board.id}`).emit('task:created', { task });
  });

  eventBus.on('task.updated', ({ task, changes }) => {
    io.to(`board:${task.board}`).emit('task:updated', { taskId: task.id, changes });
  });

  eventBus.on('task.moved', ({ task, actor }) => {
    io.to(`board:${task.board}`).emit('task:moved', {
      taskId:   task.id,
      column:   task.column,
      position: task.position,
      movedBy:  actor.id,
    });
  });

  eventBus.on('task.deleted', ({ taskId, board }) => {
    io.to(`board:${board.id}`).emit('task:deleted', { taskId });
  });

  eventBus.on('board.updated', ({ board }) => {
    io.to(`board:${board.id}`).emit('board:updated', { boardId: board.id, board });
  });

  logger.info('[SOCKET] Event bridges registered');
}

module.exports = { registerBoardHandler, registerEventBridges };
