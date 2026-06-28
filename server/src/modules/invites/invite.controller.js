'use strict';
const svc          = require('./invite.service');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { success, created } = require('../../shared/utils/apiResponse');

const listInvites  = asyncHandler(async (req, res) => {
  const invites = await svc.listForOrg(req.params.orgId);
  success(res, { invites });
});
const createInvite = asyncHandler(async (req, res) => {
  const invite = await svc.create(req.params.orgId, req.body, req.user);
  created(res, { invite });
});
const acceptInvite = asyncHandler(async (req, res) => {
  const result = await svc.accept(req.body.token, req.user);
  success(res, { ...result, message: 'You have joined the organization' });
});
const revokeInvite = asyncHandler(async (req, res) => {
  await svc.revoke(req.params.inviteId, req.params.orgId);
  success(res, { message: 'Invite revoked' });
});

module.exports = { listInvites, createInvite, acceptInvite, revokeInvite };
