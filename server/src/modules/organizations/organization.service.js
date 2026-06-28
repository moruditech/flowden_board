'use strict';

const Organization = require('../../shared/models/Organization.model');
const Membership   = require('../../shared/models/Membership.model');
const Board        = require('../../shared/models/Board.model');
const Task         = require('../../shared/models/Task.model');
const Invite       = require('../../shared/models/Invite.model');
const ActivityLog  = require('../../shared/models/ActivityLog.model');
const User         = require('../../shared/models/User.model');
const AppError     = require('../../shared/utils/AppError');
const eventBus     = require('../../shared/events/eventBus');

const ROLE_RANK = { member: 0, admin: 1, owner: 2 };

const organizationService = {
  async create({ name, slug, description }, actor) {
    const existing = await Organization.findOne({ slug });
    if (existing) throw AppError.conflict(`Slug "${slug}" is already taken`);

    const org = await Organization.create({ name, slug, description, createdBy: actor.id });

    // Creator automatically becomes owner
    await Membership.create({ user: actor.id, organization: org._id, role: 'owner' });

    const result = org.toJSON();
    eventBus.emit('org.created', { org: result, actor });
    return result;
  },

  async listForUser(userId) {
    const memberships = await Membership.find({ user: userId })
      .populate('organization')
      .sort({ createdAt: -1 })
      .lean();

    return memberships
      .filter((m) => m.organization)
      .map((m) => ({ ...m.organization, role: m.role, membershipId: m._id }));
  },

  async getById(orgId, userId) {
    const membership = await Membership.findOne({ user: userId, organization: orgId });
    if (!membership) throw AppError.notFound('Organization');

    const org = await Organization.findById(orgId).lean();
    if (!org) throw AppError.notFound('Organization');
    return { ...org, role: membership.role };
  },

  async update(orgId, changes, actor) {
    const org = await Organization.findByIdAndUpdate(
      orgId,
      { $set: changes },
      { new: true, runValidators: true }
    );
    if (!org) throw AppError.notFound('Organization');
    const result = org.toJSON();
    eventBus.emit('org.updated', { org: result, actor, changes });
    return result;
  },

  async delete(orgId, actor) {
    const membership = await Membership.findOne({ user: actor.id, organization: orgId });
    if (!membership || membership.role !== 'owner') {
      throw AppError.forbidden('Only the owner can delete an organization');
    }

    const boards = await Board.find({ organization: orgId }).select('_id');
    const boardIds = boards.map((b) => b._id);

    await Promise.all([
      Task.deleteMany({ board: { $in: boardIds } }),
      Board.deleteMany({ organization: orgId }),
      Invite.deleteMany({ organization: orgId }),
      ActivityLog.deleteMany({ organization: orgId }),
      Membership.deleteMany({ organization: orgId }),
      Organization.findByIdAndDelete(orgId),
    ]);

    eventBus.emit('org.deleted', { orgId, actor });
  },

  async listMembers(orgId) {
    return Membership.find({ organization: orgId })
      .populate('user', 'name email avatarUrl createdAt')
      .sort({ createdAt: 1 })
      .lean();
  },

  async updateMemberRole(orgId, targetUserId, newRole, actor, actorMembership) {
    if (targetUserId === actor.id) {
      throw AppError.badRequest('You cannot change your own role');
    }

    const target = await Membership.findOne({ user: targetUserId, organization: orgId });
    if (!target) throw AppError.notFound('Member');
    if (target.role === 'owner') throw AppError.forbidden("The owner's role cannot be changed");

    // Admins cannot promote others to admin
    if (actorMembership.role === 'admin' && newRole === 'admin') {
      throw AppError.forbidden('Admins cannot promote members to admin');
    }

    const oldRole   = target.role;
    target.role     = newRole;
    await target.save();

    const targetUser = await User.findById(targetUserId).lean();

    eventBus.emit('member.roleChanged', {
      targetUser: targetUser || { id: targetUserId },
      org:        { id: orgId, name: '' },
      actor,
      oldRole,
      newRole,
    });

    return target.toJSON();
  },

  async removeMember(orgId, targetUserId, actor, actorMembership) {
    if (targetUserId === actor.id) {
      throw AppError.badRequest('You cannot remove yourself. Use the leave organization feature instead.');
    }

    const target = await Membership.findOne({ user: targetUserId, organization: orgId });
    if (!target) throw AppError.notFound('Member');
    if (target.role === 'owner') throw AppError.forbidden('The owner cannot be removed');
    if (actorMembership.role === 'admin' && target.role === 'admin') {
      throw AppError.forbidden('Admins cannot remove other admins');
    }

    await target.deleteOne();

    const targetUser = await User.findById(targetUserId).lean();
    const org        = await Organization.findById(orgId).lean();

    eventBus.emit('member.removed', {
      targetUser: targetUser || { id: targetUserId },
      org:        org || { id: orgId },
      actor,
    });
  },
};

module.exports = organizationService;
