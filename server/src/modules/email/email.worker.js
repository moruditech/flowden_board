'use strict';

const { Worker } = require('bullmq');
const { sendEmail } = require('./email.service');
const { getBullConn } = require('../../config/redis');
const logger = require('../../shared/utils/logger');

/**
 * Map each job name to its Handlebars template name and subject generator.
 * Subject is a function so it can use job data dynamically.
 */
const JOB_MAP = {
  sendWelcome: {
    template: 'welcome',
    subject:  (d) => `Welcome to Team Workspace, ${d.name}!`,
  },
  sendVerifyEmail: {
    template: 'verify-email',
    subject:  () => 'Please verify your email address',
  },
  sendPasswordReset: {
    template: 'password-reset',
    subject:  () => 'Reset your Team Workspace password',
  },
  sendPasswordResetSuccess: {
    template: 'password-reset-success',
    subject:  () => 'Your password has been changed',
  },
  sendTeamInvite: {
    template: 'team-invite',
    subject:  (d) => `${d.inviterName} invited you to join ${d.orgName}`,
  },
  sendInviteAccepted: {
    template: 'invite-accepted',
    subject:  (d) => `${d.newMemberName} joined ${d.orgName}`,
  },
  sendMemberRemoved: {
    template: 'member-removed',
    subject:  (d) => `You've been removed from ${d.orgName}`,
  },
  sendRoleChanged: {
    template: 'role-changed',
    subject:  (d) => `Your role in ${d.orgName} has been updated`,
  },
  sendTaskAssigned: {
    template: 'task-assigned',
    subject:  (d) => `${d.assignerName} assigned you a task`,
  },
  sendTaskDueReminder: {
    template: 'task-due-reminder',
    subject:  (d) => `Reminder: "${d.taskTitle}" is due tomorrow`,
  },
  sendWeeklyDigest: {
    template: 'weekly-digest',
    subject:  (d) => `Your weekly summary for ${d.orgName}`,
  },
  sendSecurityAlert: {
    template: 'security-alert',
    subject:  () => 'New sign-in to your Team Workspace account',
  },
  sendAccountDeleted: {
    template: 'account-deleted',
    subject:  () => 'Your Team Workspace account has been deleted',
  },
};

/**
 * createEmailWorker — creates and returns the BullMQ Worker.
 * Called once from jobs/index.js during bootstrap.
 */
function createEmailWorker() {
  const worker = new Worker(
    'email',
    async (job) => {
      const config = JOB_MAP[job.name];

      if (!config) {
        logger.warn(`[EMAIL-WORKER] Unknown job name: "${job.name}" — skipping`);
        return;
      }

      const { to, ...context } = job.data;

      if (!to) {
        logger.warn(`[EMAIL-WORKER] Job "${job.name}" has no "to" field — skipping`);
        return;
      }

      await sendEmail({
        to,
        subject:  config.subject(job.data),
        template: config.template,
        context,
      });
    },
    {
      connection: getBullConn(),
      concurrency: 5, // Process up to 5 emails in parallel
    }
  );

  worker.on('completed', (job) => {
    logger.debug(`[EMAIL-WORKER] Completed: ${job.name} → ${job.data.to}`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[EMAIL-WORKER] Failed: ${job?.name} → ${job?.data?.to} | ${err.message}`);
  });

  worker.on('error', (err) => {
    logger.error(`[EMAIL-WORKER] Worker error: ${err.message}`);
  });

  logger.info('[EMAIL-WORKER] Email worker started');
  return worker;
}

module.exports = { createEmailWorker };
