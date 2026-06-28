'use strict';

const EventEmitter = require('events');

/**
 * Application event bus — singleton Node.js EventEmitter.
 *
 * Services emit events here when something meaningful happens.
 * Side effects (email queuing, socket broadcasts, activity logging)
 * subscribe to these events in their own modules. This keeps services
 * completely decoupled from email, sockets, and logging.
 *
 * Emitted events:
 *
 *   Auth
 *     auth.registered    { user }
 *     auth.login         { user, ip, userAgent, isNewDevice }
 *     auth.forgotPassword{ user, resetUrl }
 *     auth.passwordReset { user, ip }
 *     auth.emailVerified { user }
 *
 *   Organizations
 *     org.created        { org, actor }
 *     org.updated        { org, actor, changes }
 *     org.deleted        { orgId, actor }
 *
 *   Memberships
 *     member.invited     { invite, org, actor, inviteUrl }
 *     member.joined      { membership, org, actor }
 *     member.removed     { targetUser, org, actor }
 *     member.roleChanged { targetUser, org, actor, oldRole, newRole }
 *
 *   Boards
 *     board.created      { board, org, actor }
 *     board.updated      { board, org, actor, changes }
 *     board.deleted      { boardId, orgId, actor }
 *
 *   Tasks
 *     task.created       { task, board, actor }
 *     task.updated       { task, board, actor, changes }
 *     task.moved         { task, board, actor, fromColumn, toColumn }
 *     task.deleted       { taskId, board, actor }
 *     task.assigned      { task, board, assignee, actor }
 *
 *   Users
 *     user.deleted       { user }
 */
class EventBus extends EventEmitter {}

const eventBus = new EventBus();

// Increase default listener limit to avoid Node.js warnings in large apps
eventBus.setMaxListeners(30);

// Log unhandled event errors so they don't crash the process silently
eventBus.on('error', (err) => {
  const logger = require('../utils/logger');
  logger.error('EventBus error:', err);
});

module.exports = eventBus;
