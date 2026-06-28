'use strict';

const { Router } = require('express');

/**
 * Central route registry.
 *
 * This file's only job is to import each module's router and mount it
 * under the correct path. No middleware, no logic — just wiring.
 *
 * All routes here are relative to /api/v1 (set in app.js).
 *
 * Module routers are imported lazily using require() so this file can
 * be parsed without all modules being fully implemented yet.
 */

const router = Router();

router.use('/auth',          require('../modules/auth/auth.routes'));
router.use('/users',         require('../modules/users/user.routes'));
router.use('/organizations', require('../modules/organizations/organization.routes'));
router.use('/boards',        require('../modules/boards/board.routes'));
router.use('/tasks',         require('../modules/tasks/task.routes'));
router.use('/invites',       require('../modules/invites/invite.routes'));
router.use('/activity',      require('../modules/activity/activity.routes'));

module.exports = router;
