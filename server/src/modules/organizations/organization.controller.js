'use strict';
const svc          = require('./organization.service');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { success, created } = require('../../shared/utils/apiResponse');

const listOrgs    = asyncHandler(async (req, res) => {
  const orgs = await svc.listForUser(req.user.id);
  success(res, { orgs });
});

const createOrg   = asyncHandler(async (req, res) => {
  const org = await svc.create(req.body, req.user);
  created(res, { org });
});

const getOrg      = asyncHandler(async (req, res) => {
  const org = await svc.getById(req.params.orgId, req.user.id);
  success(res, { org });
});

const updateOrg   = asyncHandler(async (req, res) => {
  const org = await svc.update(req.params.orgId, req.body, req.user);
  success(res, { org });
});

const deleteOrg   = asyncHandler(async (req, res) => {
  await svc.delete(req.params.orgId, req.user);
  success(res, { message: 'Organization deleted' });
});

const listMembers = asyncHandler(async (req, res) => {
  const members = await svc.listMembers(req.params.orgId);
  success(res, { members });
});

const updateMemberRole = asyncHandler(async (req, res) => {
  const membership = await svc.updateMemberRole(
    req.params.orgId, req.params.userId,
    req.body.role, req.user, req.membership
  );
  success(res, { membership });
});

const removeMember = asyncHandler(async (req, res) => {
  await svc.removeMember(req.params.orgId, req.params.userId, req.user, req.membership);
  success(res, { message: 'Member removed' });
});

module.exports = { listOrgs, createOrg, getOrg, updateOrg, deleteOrg, listMembers, updateMemberRole, removeMember };
