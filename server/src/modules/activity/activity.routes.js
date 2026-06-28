'use strict';
const { Router }   = require('express');
const authenticate = require('../../shared/middleware/authenticate');
const authorize    = require('../../shared/middleware/authorize');
const ctrl         = require('./activity.controller');

const router = Router();
router.use(authenticate);
router.get('/org/:orgId', authorize('member'), ctrl.listActivity);

module.exports = router;
