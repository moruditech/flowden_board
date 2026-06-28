'use strict';

const logger = require('../../../shared/utils/logger');

const PRESENCE_TTL = 60 * 5; // 5 minutes — cleaned up if heartbeat stops

/**
 * registerPresenceHandler
 *
 * Tracks which users are currently viewing which board.
 * Uses Redis sets: key = `presence:board:{boardId}`, value = userId.
 *
 * On join:       adds user to the set, broadcasts presence:join to the room
 * On disconnect: removes user from all sets they're in, broadcasts presence:leave
 */
function registerPresenceHandler(io, socket) {
  const { id: userId, email } = socket.data.user;
  const activeBoardIds        = new Set();

  // Called when client joins a board room (after board:join fires)
  socket.on('board:join', async (boardId) => {
    try {
      const { getRedis } = require('../../../config/redis');
      const redis        = getRedis();
      const key          = `presence:board:${boardId}`;

      await redis.sadd(key, userId);
      await redis.expire(key, PRESENCE_TTL);

      activeBoardIds.add(boardId);

      // Get full presence list and broadcast
      const members = await redis.smembers(key);

      // Broadcast to everyone in the room including the joining user
      io.to(`board:${boardId}`).emit('presence:join', { userId, name: email.split('@')[0] });

      // Send current presence list to the joining socket only
      socket.emit('presence:current', { boardId, userIds: members });

    } catch (err) {
      logger.error(`[PRESENCE] join error: ${err.message}`);
    }
  });

  socket.on('board:leave', async (boardId) => {
    try {
      const { getRedis } = require('../../../config/redis');
      const redis        = getRedis();

      await redis.srem(`presence:board:${boardId}`, userId);
      activeBoardIds.delete(boardId);

      io.to(`board:${boardId}`).emit('presence:leave', { userId });
    } catch (err) {
      logger.error(`[PRESENCE] leave error: ${err.message}`);
    }
  });

  // Clean up on disconnect
  socket.on('disconnect', async () => {
    try {
      if (activeBoardIds.size === 0) return;

      const { getRedis } = require('../../../config/redis');
      const redis        = getRedis();

      await Promise.all(
        [...activeBoardIds].map(async (boardId) => {
          await redis.srem(`presence:board:${boardId}`, userId);
          io.to(`board:${boardId}`).emit('presence:leave', { userId });
        })
      );

      activeBoardIds.clear();
    } catch (err) {
      logger.error(`[PRESENCE] disconnect cleanup error: ${err.message}`);
    }
  });
}

module.exports = { registerPresenceHandler };
