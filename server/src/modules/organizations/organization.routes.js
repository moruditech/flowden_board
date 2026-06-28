'use strict';
const { Router }   = require('express');
const authenticate = require('../../shared/middleware/authenticate');
const authorize    = require('../../shared/middleware/authorize');
const validate     = require('../../shared/middleware/validate');
const schemas      = require('./organization.validation');
const ctrl         = require('./organization.controller');

const router = Router();
router.use(authenticate);

router.get('/',    ctrl.listOrgs);
router.post('/',   validate(schemas.createOrg), ctrl.createOrg);

router.get('/:orgId',     authorize('member'), ctrl.getOrg);
router.patch('/:orgId',   authorize('admin'),  validate(schemas.updateOrg),        ctrl.updateOrg);
router.delete('/:orgId',  authorize('owner'),  ctrl.deleteOrg);

router.get('/:orgId/members',              authorize('member'), ctrl.listMembers);
router.patch('/:orgId/members/:userId',    authorize('admin'),  validate(schemas.updateMemberRole), ctrl.updateMemberRole);
router.delete('/:orgId/members/:userId',   authorize('admin'),  ctrl.removeMember);

module.exports = router;
