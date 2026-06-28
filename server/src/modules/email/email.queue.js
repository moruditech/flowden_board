'use strict';

const { Queue } = require('bullmq');
const { getBullConn } = require('../../config/redis');
const logger = require('../../shared/utils/logger');

// ── Queue instance ────────────────────────────────────────────────────────────

let emailQueue = null;

function getEmailQueue() {
  if (!emailQueue) {
    emailQueue = new Queue('email', {
      connection: getBullConn(),
      defaultJobOptions: {
        attempts:    3,
        backoff:     { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail:     { count: 50  },
      },
    });

    emailQueue.on('error', (err) => {
      logger.error(`[EMAIL-QUEUE] Error: ${err.message}`);
    });
  }
  return emailQueue;
}

// ── Job helpers ───────────────────────────────────────────────────────────────

async function addJob(name, data, opts = {}) {
  try {
    await getEmailQueue().add(name, data, opts);
    logger.debug(`[EMAIL-QUEUE] Job added: ${name}`);
  } catch (err) {
    logger.error(`[EMAIL-QUEUE] Failed to add job "${name}": ${err.message}`);
  }
}

// One helper per email type — matches template names exactly

const addWelcomeJob = (data) =>
  addJob('sendWelcome', data);

const addVerifyEmailJob = (data) =>
  addJob('sendVerifyEmail', data);

const addPasswordResetJob = (data) =>
  addJob('sendPasswordReset', data);

const addPasswordResetSuccessJob = (data) =>
  addJob('sendPasswordResetSuccess', data);

const addTeamInviteJob = (data) =>
  addJob('sendTeamInvite', data);

const addInviteAcceptedJob = (data) =>
  addJob('sendInviteAccepted', data);

const addMemberRemovedJob = (data) =>
  addJob('sendMemberRemoved', data);

const addRoleChangedJob = (data) =>
  addJob('sendRoleChanged', data);

const addTaskAssignedJob = (data) =>
  addJob('sendTaskAssigned', data);

/**
 * Task due reminder — delayed so the job fires 24h before the due date.
 * @param {object} data
 * @param {number} delayMs - milliseconds until the job should be processed
 */
const addTaskDueReminderJob = (data, delayMs) =>
  addJob('sendTaskDueReminder', data, { delay: delayMs });

const addWeeklyDigestJob = (data) =>
  addJob('sendWeeklyDigest', data);

const addSecurityAlertJob = (data) =>
  addJob('sendSecurityAlert', data);

const addAccountDeletedJob = (data) =>
  addJob('sendAccountDeleted', data);

module.exports = {
  getEmailQueue,
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
  addWeeklyDigestJob,
  addSecurityAlertJob,
  addAccountDeletedJob,
};
