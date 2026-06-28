'use strict';

const mongoose   = require('mongoose');
const User       = require('../../src/shared/models/User.model');
const RefreshToken = require('../../src/shared/models/RefreshToken.model');
const Organization = require('../../src/shared/models/Organization.model');
const Membership = require('../../src/shared/models/Membership.model');
const Board      = require('../../src/shared/models/Board.model');
const Task       = require('../../src/shared/models/Task.model');
const Invite     = require('../../src/shared/models/Invite.model');
const { hashPassword }       = require('../../src/shared/utils/bcrypt');
const { signAccessToken }    = require('../../src/shared/utils/jwt');
const { generateToken, hashToken } = require('../../src/shared/utils/crypto');

const DEFAULT_PASSWORD = 'Password1!';

/**
 * Create a test user with a known password.
 * Returns the user document + raw password + valid access token.
 */
async function createUser(overrides = {}) {
  const email        = overrides.email || `user-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  const user = await User.create({
    name:          overrides.name     || 'Test User',
    email,
    passwordHash,
    emailVerified: overrides.emailVerified !== undefined ? overrides.emailVerified : true,
    isActive:      overrides.isActive  !== undefined ? overrides.isActive  : true,
    ...overrides,
  });

  const accessToken = signAccessToken({ sub: user._id.toString(), email: user.email });

  return { user, accessToken, password: DEFAULT_PASSWORD };
}

/**
 * Create an organization and add the given user as owner.
 */
async function createOrg(ownerId, overrides = {}) {
  const slug = overrides.slug || `org-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const org  = await Organization.create({
    name:      overrides.name || 'Test Org',
    slug,
    createdBy: ownerId,
  });

  await Membership.create({ user: ownerId, organization: org._id, role: 'owner' });
  return org;
}

/**
 * Add a user to an org with a given role.
 */
async function addMember(userId, orgId, role = 'member') {
  return Membership.create({ user: userId, organization: orgId, role });
}

/**
 * Create a board with default columns.
 */
async function createBoard(orgId, createdBy, overrides = {}) {
  return Board.create({
    organization: orgId,
    name:         overrides.name || 'Test Board',
    description:  '',
    columns: [
      { _id: new mongoose.Types.ObjectId(), name: 'To Do',       order: 0 },
      { _id: new mongoose.Types.ObjectId(), name: 'In Progress', order: 1 },
      { _id: new mongoose.Types.ObjectId(), name: 'Done',        order: 2 },
    ],
    createdBy,
  });
}

/**
 * Create a task in the first column of the given board.
 */
async function createTask(boardId, createdBy, overrides = {}) {
  const board = await Board.findById(boardId);
  const colId = board.columns[0]._id;

  return Task.create({
    board:       boardId,
    column:      colId,
    title:       overrides.title    || 'Test Task',
    description: overrides.description || '',
    position:    overrides.position ?? 1000,
    assignee:    overrides.assignee || null,
    createdBy,
  });
}

/**
 * Create a pending invite.
 */
async function createInvite(orgId, invitedBy, email, role = 'member') {
  const rawToken = generateToken(32);
  return {
    invite: await Invite.create({
      organization: orgId,
      email,
      role,
      tokenHash:  hashToken(rawToken),
      invitedBy,
      expiresAt:  new Date(Date.now() + 48 * 60 * 60 * 1000),
    }),
    rawToken,
  };
}

module.exports = {
  createUser,
  createOrg,
  addMember,
  createBoard,
  createTask,
  createInvite,
  DEFAULT_PASSWORD,
};
