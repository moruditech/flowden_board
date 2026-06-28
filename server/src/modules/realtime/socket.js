'use strict';

const { Server }     = require('socket.io');
const socketAuth     = require('./socketAuth');
const { registerBoardHandler, registerEventBridges } = require('./handlers/board.handler');
const { registerPresenceHandler } = require('./handlers/presence.handler');
const env    = require('../../config/env');
const logger = require('../../shared/utils/logger');

let io = null;

/**
 * initSocket
 *
 * Attaches Socket.io to an existing HTTP server.
 * Called once from server.js after Redis and MongoDB are ready.
 *
 * @param {http.Server} httpServer
 * @returns {Server} Socket.io server instance
 */
function initSocket(httpServer) {
  const allowedOrigins = env.CLIENT_URL.split(',').map((o) => o.trim());

  io = new Server(httpServer, {
    cors: {
      origin:      allowedOrigins,
      credentials: true,
    },
    pingInterval:  25_000,
    pingTimeout:   10_000,
    transports:    ['websocket', 'polling'],
  });

  // ── JWT authentication middleware ─────────────────────────────────────────
  io.use(socketAuth);

  // ── Register event bridges (once — not per socket) ───────────────────────
  registerEventBridges(io);

  // ── Per-connection handlers ───────────────────────────────────────────────
  io.on('connection', (socket) => {
    logger.info(`[SOCKET] Connected: ${socket.id} (${socket.data.user.email})`);

    registerBoardHandler(io, socket);
    registerPresenceHandler(io, socket);

    socket.on('disconnect', (reason) => {
      logger.info(`[SOCKET] Disconnected: ${socket.id} — reason: ${reason}`);
    });

    socket.on('error', (err) => {
      logger.error(`[SOCKET] Socket error on ${socket.id}: ${err.message}`);
    });
  });

  logger.info(`[SOCKET] Socket.io server ready`);
  return io;
}

/**
 * getIO
 * Returns the Socket.io instance after initSocket() has been called.
 * Useful if any other module ever needs to emit directly (avoid where possible).
 */
function getIO() {
  if (!io) throw new Error('Socket.io not initialised. Call initSocket() first.');
  return io;
}

module.exports = { initSocket, getIO };
