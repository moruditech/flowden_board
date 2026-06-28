'use strict';

const ActivityLog = require('../../shared/models/ActivityLog.model');
const { parsePagination, buildMeta } = require('../../shared/utils/pagination');
const eventBus    = require('../../shared/events/eventBus');
const logger      = require('../../shared/utils/logger');

const activityService = {
  /**
   * Write an activity log entry.
   * Fire-and-forget — never blocks the caller.
   */
  async log(orgId, actorId, action, metadata = {}, boardId = null) {
    try {
      await ActivityLog.create({ organization: orgId, actor: actorId, action, metadata, board: boardId });
    } catch (err) {
      logger.error(`[ACTIVITY] Failed to log "${action}": ${err.message}`);
    }
  },

  async listForOrg(orgId, query = {}) {
    const { page, limit, skip } = parsePagination(query);
    const filter = {
      organization: orgId,
      ...(query.boardId ? { board: query.boardId } : {}),
    };

    const [items, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate('actor', 'name email avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);

    return { items, meta: buildMeta(total, page, limit) };
  },

  /**
   * Register all eventBus listeners.
   * Called ONCE from server.js after DB is ready.
   * Translates domain events → activity log rows.
   */
  registerListeners() {
    const self = this;

    // ── Org events ──────────────────────────────────────────────────────────
    eventBus.on('org.created', ({ org, actor }) => {
      self.log(org.id, actor.id, 'org.created', { name: org.name });
    });

    eventBus.on('org.updated', ({ org, actor, changes }) => {
      self.log(org.id, actor.id, 'org.updated', { changes });
    });

    // ── Member events ────────────────────────────────────────────────────────
    eventBus.on('member.invited', ({ invite, org, actor }) => {
      self.log(org.id, actor.id, 'member.invited', { email: invite.email, role: invite.role });
    });

    eventBus.on('member.joined', ({ actor, org, role }) => {
      self.log(org.id, actor.id, 'member.joined', { role });
    });

    eventBus.on('member.removed', ({ targetUser, org, actor }) => {
      self.log(org.id, actor.id, 'member.removed', {
        targetUserId:   targetUser?.id || targetUser?._id,
        targetUserName: targetUser?.name,
      });
    });

    eventBus.on('member.roleChanged', ({ targetUser, org, actor, oldRole, newRole }) => {
      self.log(org.id, actor.id, 'member.role_changed', {
        targetUserId:   targetUser?.id || targetUser?._id,
        targetUserName: targetUser?.name,
        oldRole,
        newRole,
      });
    });

    // ── Board events ─────────────────────────────────────────────────────────
    eventBus.on('board.created', ({ board, orgId, actor }) => {
      self.log(orgId, actor.id, 'board.created', { name: board.name }, board.id);
    });

    eventBus.on('board.updated', ({ board, orgId, actor, changes }) => {
      self.log(orgId, actor.id, 'board.updated', { changes }, board.id);
    });

    eventBus.on('board.deleted', ({ boardId, orgId, actor }) => {
      self.log(orgId, actor.id, 'board.deleted', { boardId });
    });

    // ── Task events ──────────────────────────────────────────────────────────
    eventBus.on('task.created', ({ task, board, actor }) => {
      self.log(board.organization || board.id, actor.id, 'task.created',
        { taskId: task.id, title: task.title }, board.id);
    });

    eventBus.on('task.updated', ({ task, board, actor, changes }) => {
      self.log(board.organization || board.id, actor.id, 'task.updated',
        { taskId: task.id, changes }, board.id);
    });

    eventBus.on('task.moved', ({ task, board, actor, fromColumn, toColumn }) => {
      self.log(board.organization || board.id, actor.id, 'task.moved',
        { taskId: task.id, fromColumn, toColumn }, board.id);
    });

    eventBus.on('task.deleted', ({ taskId, board, actor }) => {
      self.log(board.organization || board.id, actor.id, 'task.deleted',
        { taskId }, board.id);
    });

    eventBus.on('task.assigned', ({ task, board, assignee, actor }) => {
      self.log(board.organization || board.id, actor.id, 'task.assigned', {
        taskId:       task.id,
        taskTitle:    task.title,
        assigneeId:   assignee?.id || assignee?._id,
        assigneeName: assignee?.name,
      }, board.id);
    });

    logger.info('Activity service listeners registered');
  },
};

module.exports = activityService;
