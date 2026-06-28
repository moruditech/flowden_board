'use strict';

const { Worker } = require('bullmq');
const { getBullConn } = require('../../config/redis');
const { getCleanupQueue } = require('../queues');
const logger = require('../../shared/utils/logger');

async function purgeExpiredTokens() {
  const RefreshToken = require('../../shared/models/RefreshToken.model');
  const result = await RefreshToken.deleteMany({ expiresAt: { $lt: new Date() } });
  logger.info(`[CLEANUP] Purged ${result.deletedCount} expired refresh tokens`);
}

async function purgeExpiredInvites() {
  const Invite = require('../../shared/models/Invite.model');
  // Delete accepted invites older than 30 days
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await Invite.deleteMany({
    $or: [
      { acceptedAt: { $lt: cutoff } },
      { expiresAt: { $lt: new Date() }, acceptedAt: null },
    ],
  });
  logger.info(`[CLEANUP] Purged ${result.deletedCount} expired/accepted invites`);
}

async function scheduleWeeklyDigests() {
  const Membership     = require('../../shared/models/Membership.model');
  const ActivityLog    = require('../../shared/models/ActivityLog.model');
  const { addWeeklyDigestJob } = require('../../modules/email/email.queue');

  const oneWeekAgo  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const memberships = await Membership.find({})
    .populate('user', 'name email isActive')
    .populate('organization', 'name')
    .lean();

  let sent = 0;
  for (const m of memberships) {
    if (!m.user || !m.user.isActive || !m.organization) continue;

    // Gather basic weekly stats for this org
    const [tasksCreated, tasksMoved] = await Promise.all([
      ActivityLog.countDocuments({ organization: m.organization._id, action: 'task.created', createdAt: { $gte: oneWeekAgo } }),
      ActivityLog.countDocuments({ organization: m.organization._id, action: 'task.moved',   createdAt: { $gte: oneWeekAgo } }),
    ]);

    const activeMembers = await Membership.countDocuments({ organization: m.organization._id });

    await addWeeklyDigestJob({
      to:      m.user.email,
      name:    m.user.name,
      orgName: m.organization.name,
      stats: {
        tasksCreated,
        tasksCompleted: tasksMoved, // approximation: "moved" used as proxy for progress
        tasksMoved,
        activeMembers,
        activeBoards: 0, // could query Board model
        myTasks:      [],
      },
    });
    sent++;
  }

  logger.info(`[CLEANUP] Scheduled ${sent} weekly digest emails`);
}

function createCleanupWorker() {
  const queue  = getCleanupQueue();

  // Schedule repeating jobs on first run
  queue.add('purgeExpiredTokens',  {}, { repeat: { every: 6 * 60 * 60 * 1000  } }); // every 6h
  queue.add('purgeExpiredInvites', {}, { repeat: { every: 24 * 60 * 60 * 1000 } }); // every 24h
  queue.add('weeklyDigest',        {}, { repeat: { cron: '0 8 * * 1'           } }); // Mon 8am UTC

  const worker = new Worker(
    'cleanup',
    async (job) => {
      switch (job.name) {
        case 'purgeExpiredTokens':  await purgeExpiredTokens();  break;
        case 'purgeExpiredInvites': await purgeExpiredInvites(); break;
        case 'weeklyDigest':        await scheduleWeeklyDigests(); break;
        default: logger.warn(`[CLEANUP-WORKER] Unknown job: ${job.name}`);
      }
    },
    { connection: getBullConn(), concurrency: 1 }
  );

  worker.on('completed', (job) => logger.debug(`[CLEANUP-WORKER] Done: ${job.name}`));
  worker.on('failed', (job, err) => logger.error(`[CLEANUP-WORKER] Failed: ${job?.name} — ${err.message}`));
  worker.on('error', (err) => logger.error(`[CLEANUP-WORKER] Error: ${err.message}`));

  logger.info('[CLEANUP-WORKER] Cleanup worker started');
  return worker;
}

module.exports = { createCleanupWorker };
