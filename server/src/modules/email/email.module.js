'use strict';

const eventBus = require('../../shared/events/eventBus');
const logger   = require('../../shared/utils/logger');
const {
  addWelcomeJob,
  addVerifyEmailJob,
  addPasswordResetJob,
  addPasswordResetSuccessJob,
  addTeamInviteJob,
  addInviteAcceptedJob,
  addMemberRemovedJob,
  addRoleChangedJob,
  addTaskAssignedJob,
  addTaskDueReminderJob,
  addSecurityAlertJob,
  addAccountDeletedJob,
} = require('./email.queue');

/**
 * email.module.js
 *
 * This is the ONLY file that knows about both the eventBus and the email queue.
 * Services emit events. This module listens and queues the correct email job.
 * The worker picks it up and calls email.service.sendEmail() asynchronously.
 *
 * This file is required once in server.js after Redis is ready.
 */

// ── Auth events ───────────────────────────────────────────────────────────────

eventBus.on('auth.registered', ({ user, verifyUrl }) => {
  // Welcome email
  addWelcomeJob({ to: user.email, name: user.name });

  // Email verification
  addVerifyEmailJob({ to: user.email, name: user.name, verifyUrl });
});

eventBus.on('auth.login', ({ user, ip, userAgent, isNewDevice }) => {
  if (!isNewDevice) return;

  addSecurityAlertJob({
    to:        user.email,
    name:      user.name,
    ip:        ip || 'Unknown',
    userAgent: userAgent || 'Unknown',
    timestamp: new Date().toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC',
    resetUrl:  `${process.env.CLIENT_URL}/auth/forgot-password`,
  });
});

eventBus.on('auth.forgotPassword', ({ user, resetUrl }) => {
  addPasswordResetJob({
    to:        user.email,
    name:      user.name,
    resetUrl,
    expiresIn: '1 hour',
  });
});

eventBus.on('auth.passwordReset', ({ user, ip }) => {
  addPasswordResetSuccessJob({
    to:        user.email,
    name:      user.name,
    ip:        ip || 'Unknown',
    timestamp: new Date().toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC',
    resetUrl:  `${process.env.CLIENT_URL}/auth/forgot-password`,
  });
});

// ── Invite events ─────────────────────────────────────────────────────────────

eventBus.on('member.invited', ({ invite, org, actor, inviteUrl }) => {
  addTeamInviteJob({
    to:          invite.email,
    inviterName: actor.name,
    orgName:     org.name,
    role:        invite.role,
    inviteUrl,
    expiresIn:   '48 hours',
  });
});

eventBus.on('member.joined', ({ actor, org, invitedBy }) => {
  if (!invitedBy?.email) return;

  addInviteAcceptedJob({
    to:            invitedBy.email,
    inviterName:   invitedBy.name,
    newMemberName: actor.name,
    newMemberEmail:actor.email,
    orgName:       org.name,
    orgUrl:        `${process.env.CLIENT_URL}/organizations/${org.id}`,
  });
});

// ── Member management events ──────────────────────────────────────────────────

eventBus.on('member.removed', ({ targetUser, org, actor }) => {
  if (!targetUser?.email) return;

  addMemberRemovedJob({
    to:            targetUser.email,
    name:          targetUser.name,
    orgName:       org.name,
    removedByName: actor.name,
    supportUrl:    `${process.env.CLIENT_URL}/support`,
  });
});

eventBus.on('member.roleChanged', ({ targetUser, org, actor, oldRole, newRole }) => {
  if (!targetUser?.email) return;

  addRoleChangedJob({
    to:      targetUser.email,
    name:    targetUser.name,
    orgName: org.name,
    oldRole,
    newRole,
    orgUrl:  `${process.env.CLIENT_URL}/organizations/${org.id}`,
  });
});

// ── Task events ───────────────────────────────────────────────────────────────

eventBus.on('task.assigned', ({ task, board, assignee, actor }) => {
  if (!assignee?.email) return;
  // Don't notify if the user assigned the task to themselves
  if (assignee.id === actor.id) return;

  addTaskAssignedJob({
    to:           assignee.email,
    name:         assignee.name,
    taskTitle:    task.title,
    taskUrl:      `${process.env.CLIENT_URL}/boards/${board.id}?task=${task.id}`,
    boardName:    board.name,
    assignerName: actor.name,
    dueDate:      task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { dateStyle: 'medium' }) : null,
  });

  // Schedule due reminder if dueDate is set and in the future
  if (task.dueDate) {
    const dueMs   = new Date(task.dueDate).getTime();
    const nowMs   = Date.now();
    const delayMs = dueMs - nowMs - (24 * 60 * 60 * 1000); // 24h before

    if (delayMs > 0) {
      addTaskDueReminderJob({
        to:        assignee.email,
        name:      assignee.name,
        taskTitle: task.title,
        taskUrl:   `${process.env.CLIENT_URL}/boards/${board.id}?task=${task.id}`,
        boardName: board.name,
        dueDate:   new Date(task.dueDate).toLocaleDateString('en-US', { dateStyle: 'full' }),
      }, delayMs);
    }
  }
});

// ── User events ───────────────────────────────────────────────────────────────

eventBus.on('user.deleted', ({ user }) => {
  addAccountDeletedJob({
    to:   user.email,
    name: user.name,
  });
});

logger.info('Email module listeners registered');
