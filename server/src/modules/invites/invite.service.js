'use strict';

const Invite       = require('../../shared/models/Invite.model');
const Membership   = require('../../shared/models/Membership.model');
const Organization = require('../../shared/models/Organization.model');
const User         = require('../../shared/models/User.model');
const AppError     = require('../../shared/utils/AppError');
const { generateToken, hashToken } = require('../../shared/utils/crypto');
const eventBus     = require('../../shared/events/eventBus');
const env          = require('../../config/env');

const inviteService = {
  async create(orgId, { email, role }, actor) {
    const org = await Organization.findById(orgId);
    if (!org) throw AppError.notFound('Organization');

    // Prevent inviting someone who is already a member
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      const existing = await Membership.findOne({ user: existingUser._id, organization: orgId });
      if (existing) throw AppError.conflict('This user is already a member of the organization');
    }

    // Revoke any existing pending invite for this email + org
    await Invite.deleteMany({ organization: orgId, email, acceptedAt: null });

    const rawToken = generateToken(32);
    const invite   = await Invite.create({
      organization: orgId,
      email,
      role,
      tokenHash:  hashToken(rawToken),
      invitedBy:  actor.id,
      expiresAt:  new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h
    });

    const inviteUrl = `${env.CLIENT_URL}/invites/accept?token=${rawToken}`;

    eventBus.emit('member.invited', {
      invite:    invite.toJSON(),
      org:       org.toJSON(),
      actor,
      inviteUrl,
    });

    return invite.toJSON();
  },

  async accept(rawToken, actor) {
    const tokenHash = hashToken(rawToken);
    const invite    = await Invite.findOne({ tokenHash }).select('+tokenHash');
    if (!invite) throw AppError.notFound('Invite');
    if (invite.acceptedAt) throw AppError.badRequest('This invitation has already been used');
    if (invite.expiresAt < new Date()) throw AppError.badRequest('This invitation has expired');
    if (invite.email !== actor.email) {
      throw AppError.forbidden('This invitation was sent to a different email address');
    }

    // Create membership
    await Membership.create({
      user:         actor.id,
      organization: invite.organization,
      role:         invite.role,
    });

    invite.acceptedAt = new Date();
    await invite.save();

    const org       = await Organization.findById(invite.organization).lean();
    const invitedBy = await User.findById(invite.invitedBy).lean();

    eventBus.emit('member.joined', {
      actor,
      org:       org || { id: invite.organization.toString() },
      invitedBy: invitedBy || null,
      role:      invite.role,
    });

    return { org, role: invite.role };
  },

  async listForOrg(orgId) {
    return Invite.find({ organization: orgId, acceptedAt: null })
      .populate('invitedBy', 'name email avatarUrl')
      .sort({ createdAt: -1 })
      .lean();
  },

  async revoke(inviteId, orgId) {
    const invite = await Invite.findOneAndDelete({ _id: inviteId, organization: orgId });
    if (!invite) throw AppError.notFound('Invite');
  },
};

module.exports = inviteService;
