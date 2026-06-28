'use strict';
const { Router }   = require('express');
const authenticate = require('../../shared/middleware/authenticate');
const authorize    = require('../../shared/middleware/authorize');
const validate     = require('../../shared/middleware/validate');
const schemas      = require('./invite.validation');
const ctrl         = require('./invite.controller');

const router = Router();
router.use(authenticate);

router.get('/org/:orgId',            authorize('admin'), ctrl.listInvites);
router.post('/org/:orgId',           authorize('admin'), validate(schemas.createInvite), ctrl.createInvite);
router.delete('/org/:orgId/:inviteId', authorize('admin'), ctrl.revokeInvite);
router.post('/accept',               validate(schemas.acceptInvite), ctrl.acceptInvite);

module.exports = router;
