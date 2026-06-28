'use strict';

/**
 * seed.js — Full test-data seed for Team Workspace
 *
 * Drops and recreates all collections with realistic, varied data so
 * every UI surface, auth path, and activity-feed entry has something to
 * render during development and QA.
 *
 * Usage:
 *   npm run seed              # from server/
 *   node scripts/seed.js      # direct
 *
 * What gets created:
 *   Users        6  (owner · admin · member · inactive · unverified · orphan)
 *   Orgs         2  (Alpha Labs · Beta Studio)
 *   Memberships  7
 *   Boards       3  (Sprint + archived Design board for Alpha; Feature for Beta)
 *   Tasks       24  (varied labels · due dates · descriptions · assignees)
 *   ActivityLogs 30 (all action types)
 *   Invites       4  (2 pending · 2 accepted)
 */

require('dotenv').config();

const mongoose = require('mongoose');
const env      = require('../src/config/env');

const { hashPassword }            = require('../src/shared/utils/bcrypt');
const { generateToken, hashToken } = require('../src/shared/utils/crypto');

// ─── helpers ────────────────────────────────────────────────────────────────

const id = () => new mongoose.Types.ObjectId();

/** Return a Date offset from now by `days` (negative = past, positive = future). */
const daysFromNow = (days) => new Date(Date.now() + days * 86_400_000);

/** Convenience: log with a section divider. */
const section = (label) =>
  console.log(`\n  ── ${label} ${'─'.repeat(Math.max(0, 44 - label.length))}`);

// ─── seed ───────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Models must be required after mongoose connects so plugins register correctly
  const User         = require('../src/shared/models/User.model');
  const Organization = require('../src/shared/models/Organization.model');
  const Membership   = require('../src/shared/models/Membership.model');
  const Board        = require('../src/shared/models/Board.model');
  const Task         = require('../src/shared/models/Task.model');
  const ActivityLog  = require('../src/shared/models/ActivityLog.model');
  const Invite       = require('../src/shared/models/Invite.model');

  // ── Wipe previous seed data ──────────────────────────────────────────────
  section('Wiping previous seed data');

  const SEED_EMAILS = [
    'alice@demo.com',
    'bob@demo.com',
    'carol@demo.com',
    'dave@demo.com',
    'eve@demo.com',
    'frank@demo.com',
  ];
  const SEED_SLUGS = ['alpha-labs', 'beta-studio'];

  const [seedUsers, seedOrgs] = await Promise.all([
    User.find({ email: { $in: SEED_EMAILS } }).select('_id').lean(),
    Organization.find({ slug: { $in: SEED_SLUGS } }).select('_id').lean(),
  ]);

  const seedUserIds = seedUsers.map((u) => u._id);
  const seedOrgIds  = seedOrgs.map((o) => o._id);

  // Find boards owned by seed orgs so we can wipe tasks/activity for them too
  const seedBoards = seedOrgIds.length
    ? await Board.find({ organization: { $in: seedOrgIds } }).select('_id').lean()
    : [];
  const seedBoardIds = seedBoards.map((b) => b._id);

  await Promise.all([
    User.deleteMany({ email: { $in: SEED_EMAILS } }),
    Organization.deleteMany({ slug: { $in: SEED_SLUGS } }),
    Membership.deleteMany({ user: { $in: seedUserIds } }),
    Board.deleteMany({ organization: { $in: seedOrgIds } }),
    Task.deleteMany({ board: { $in: seedBoardIds } }),
    ActivityLog.deleteMany({ organization: { $in: seedOrgIds } }),
    Invite.deleteMany({ organization: { $in: seedOrgIds } }),
  ]);

  console.log('  ✓ Cleared');

  // ── Users ────────────────────────────────────────────────────────────────
  section('Users');

  const PASSWORD      = 'Password1!';
  const passwordHash  = await hashPassword(PASSWORD);

  // Pre-generate ObjectIds so we can wire cross-references freely
  const aliceId = id();
  const bobId   = id();
  const carolId = id();
  const daveId  = id();
  const eveId   = id();
  const frankId = id();

  await User.insertMany([
    // ── Active, verified ────────────────────────────────────────────────────
    {
      _id:           aliceId,
      name:          'Alice Nkosi',
      email:         'alice@demo.com',
      passwordHash,
      avatarUrl:     'https://api.dicebear.com/8.x/adventurer/svg?seed=alice',
      isActive:      true,
      emailVerified: true,
    },
    {
      _id:           bobId,
      name:          'Bob Dlamini',
      email:         'bob@demo.com',
      passwordHash,
      avatarUrl:     'https://api.dicebear.com/8.x/adventurer/svg?seed=bob',
      isActive:      true,
      emailVerified: true,
    },
    {
      _id:           carolId,
      name:          'Carol Sithole',
      email:         'carol@demo.com',
      passwordHash,
      avatarUrl:     'https://api.dicebear.com/8.x/adventurer/svg?seed=carol',
      isActive:      true,
      emailVerified: true,
    },
    // ── Inactive (soft-deleted / suspended) ─────────────────────────────────
    {
      _id:           daveId,
      name:          'Dave Mokoena',
      email:         'dave@demo.com',
      passwordHash,
      avatarUrl:     null,
      isActive:      false,    // ← inactive: login should be blocked
      emailVerified: true,
    },
    // ── Registered but email not verified ───────────────────────────────────
    {
      _id:                      eveId,
      name:                     'Eve Mahlangu',
      email:                    'eve@demo.com',
      passwordHash,
      avatarUrl:                null,
      isActive:                 true,
      emailVerified:            false,  // ← can't use most features
      emailVerificationToken:   hashToken(generateToken(32)),
      emailVerificationExpires: daysFromNow(2),
    },
    // ── Verified but belongs to no org (orphan) ─────────────────────────────
    {
      _id:           frankId,
      name:          'Frank Cele',
      email:         'frank@demo.com',
      passwordHash,
      avatarUrl:     null,
      isActive:      true,
      emailVerified: true,
    },
  ]);

  console.log('  ✓ 6 users  (alice · bob · carol · dave[inactive] · eve[unverified] · frank[no-org])');

  // ── Organizations ────────────────────────────────────────────────────────
  section('Organizations');

  const alphaId = id();
  const betaId  = id();

  await Organization.insertMany([
    {
      _id:         alphaId,
      name:        'Alpha Labs',
      slug:        'alpha-labs',
      description: 'Product development team — building the next big thing.',
      createdBy:   aliceId,
    },
    {
      _id:         betaId,
      name:        'Beta Studio',
      slug:        'beta-studio',
      description: 'Design-led studio focused on user experience research.',
      createdBy:   bobId,
    },
  ]);

  console.log('  ✓ 2 organizations  (alpha-labs · beta-studio)');

  // ── Memberships ──────────────────────────────────────────────────────────
  section('Memberships');

  // Alpha Labs: alice=owner, bob=admin, carol=member, dave=member(inactive user)
  // Beta Studio: bob=owner, carol=admin
  await Membership.insertMany([
    { user: aliceId, organization: alphaId, role: 'owner'  },
    { user: bobId,   organization: alphaId, role: 'admin'  },
    { user: carolId, organization: alphaId, role: 'member' },
    { user: daveId,  organization: alphaId, role: 'member' }, // inactive user still has a membership
    { user: bobId,   organization: betaId,  role: 'owner'  },
    { user: carolId, organization: betaId,  role: 'admin'  },
    { user: aliceId, organization: betaId,  role: 'member' },
  ]);

  console.log('  ✓ 7 memberships across both orgs');

  // ── Boards ───────────────────────────────────────────────────────────────
  section('Boards');

  // ── Alpha Labs: Sprint Board (active) ────────────────────────────────────
  const col = {
    backlog:    id(),
    todo:       id(),
    inProgress: id(),
    review:     id(),
    done:       id(),
  };

  const sprintBoardId = id();
  await Board.create({
    _id:          sprintBoardId,
    organization: alphaId,
    name:         'Q3 Sprint Board',
    description:  'Active sprint tracking board for the Q3 product cycle.',
    columns: [
      { _id: col.backlog,    name: 'Backlog',     order: 0 },
      { _id: col.todo,       name: 'To Do',       order: 1 },
      { _id: col.inProgress, name: 'In Progress', order: 2 },
      { _id: col.review,     name: 'In Review',   order: 3 },
      { _id: col.done,       name: 'Done',        order: 4 },
    ],
    isArchived: false,
    createdBy:  aliceId,
  });

  // ── Alpha Labs: Design Board (archived) ──────────────────────────────────
  const dc = { ideas: id(), wip: id(), shipped: id() };
  const designBoardId = id();
  await Board.create({
    _id:          designBoardId,
    organization: alphaId,
    name:         'Design Exploration',
    description:  'Brand refresh and component library work — archived after handoff.',
    columns: [
      { _id: dc.ideas,   name: 'Ideas',    order: 0 },
      { _id: dc.wip,     name: 'WIP',      order: 1 },
      { _id: dc.shipped, name: 'Shipped',  order: 2 },
    ],
    isArchived: true,  // ← archived board: should not appear in default board list
    createdBy:  aliceId,
  });

  // ── Beta Studio: Feature Board (active) ──────────────────────────────────
  const bc = { open: id(), progress: id(), testing: id(), closed: id() };
  const featureBoardId = id();
  await Board.create({
    _id:          featureBoardId,
    organization: betaId,
    name:         'Feature Requests',
    description:  'Collecting, triaging, and shipping user-requested features.',
    columns: [
      { _id: bc.open,     name: 'Open',       order: 0 },
      { _id: bc.progress, name: 'In Progress', order: 1 },
      { _id: bc.testing,  name: 'Testing',    order: 2 },
      { _id: bc.closed,   name: 'Closed',     order: 3 },
    ],
    isArchived: false,
    createdBy:  bobId,
  });

  console.log('  ✓ 3 boards  (Q3 Sprint · Design Exploration[archived] · Feature Requests)');

  // ── Tasks — Sprint Board ─────────────────────────────────────────────────
  section('Tasks — Q3 Sprint Board');

  await Task.insertMany([
    // Backlog
    {
      board: sprintBoardId, column: col.backlog,
      title: 'Evaluate WebSocket vs SSE for live cursors',
      description: 'Compare latency, browser support, and server resource cost. Deliver a 1-page recommendation.',
      position: 1000, labels: ['research', 'backend'],
      assignee: null, dueDate: daysFromNow(14),
      createdBy: aliceId,
    },
    {
      board: sprintBoardId, column: col.backlog,
      title: 'Accessibility audit — WCAG 2.1 AA',
      description: 'Run axe-core + manual keyboard-nav pass. Log issues as separate tasks.',
      position: 2000, labels: ['frontend', 'docs'],
      assignee: carolId, dueDate: daysFromNow(21),
      createdBy: aliceId,
    },
    {
      board: sprintBoardId, column: col.backlog,
      title: 'Dark mode theming',
      description: '',
      position: 3000, labels: ['frontend', 'design'],
      assignee: null, dueDate: null,
      createdBy: bobId,
    },
    // To Do
    {
      board: sprintBoardId, column: col.todo,
      title: 'Implement task label filter on board view',
      description: 'Multi-select label filter that updates the board in real-time via query params.',
      position: 1000, labels: ['feature', 'frontend'],
      assignee: carolId, dueDate: daysFromNow(5),
      createdBy: aliceId,
    },
    {
      board: sprintBoardId, column: col.todo,
      title: 'Rate limiting — per-user sliding window',
      description: 'Use Redis sorted sets. Window: 100 req / 60 s. Return 429 with Retry-After header.',
      position: 2000, labels: ['backend', 'security'],
      assignee: bobId, dueDate: daysFromNow(3),
      createdBy: aliceId,
    },
    {
      board: sprintBoardId, column: col.todo,
      title: 'Write onboarding docs for new team members',
      description: '',
      position: 3000, labels: ['docs'],
      assignee: carolId, dueDate: daysFromNow(7),
      createdBy: bobId,
    },
    {
      board: sprintBoardId, column: col.todo,
      title: 'Add pagination to activity feed',
      description: 'Cursor-based pagination. Page size = 25. Expose `nextCursor` in response envelope.',
      position: 4000, labels: ['backend', 'feature'],
      assignee: null, dueDate: null,
      createdBy: aliceId,
    },
    // In Progress
    {
      board: sprintBoardId, column: col.inProgress,
      title: 'Real-time board sync via Socket.io',
      description: 'Emit `board:task:moved`, `board:task:created`, `board:task:deleted` to org room. Include optimistic-update revert on error.',
      position: 1000, labels: ['feature', 'backend', 'frontend'],
      assignee: aliceId, dueDate: daysFromNow(2),
      createdBy: aliceId,
    },
    {
      board: sprintBoardId, column: col.inProgress,
      title: 'Add Redis caching for org member list',
      description: 'TTL = 5 min. Invalidate on member add / remove / role change.',
      position: 2000, labels: ['backend', 'performance'],
      assignee: bobId, dueDate: daysFromNow(1),
      createdBy: aliceId,
    },
    {
      board: sprintBoardId, column: col.inProgress,
      title: 'Mobile responsive layout for board view',
      description: 'Horizontal scroll on small viewports. Columns min-width 260px. Drag-and-drop disabled on touch (show move modal instead).',
      position: 3000, labels: ['frontend'],
      assignee: carolId, dueDate: daysFromNow(-1), // overdue ←
      createdBy: bobId,
    },
    // In Review
    {
      board: sprintBoardId, column: col.review,
      title: 'User authentication — JWT + refresh token rotation',
      description: 'Access token 15 min, refresh 7 days. Rotation on every use. Revocation via token hash blacklist in Redis.',
      position: 1000, labels: ['backend', 'security'],
      assignee: aliceId, dueDate: daysFromNow(0),
      createdBy: aliceId,
    },
    {
      board: sprintBoardId, column: col.review,
      title: 'Org invite system — email + link flow',
      description: 'SHA-256 token stored. 48-hour expiry. Auto-create account if email not found.',
      position: 2000, labels: ['feature', 'backend'],
      assignee: bobId, dueDate: daysFromNow(1),
      createdBy: aliceId,
    },
    {
      board: sprintBoardId, column: col.review,
      title: 'Fix: task position gaps after bulk delete',
      description: 'Repro: delete 3 tasks in a column, then drag a new task — gap in fractional index causes incorrect ordering.',
      position: 3000, labels: ['bug', 'backend'],
      assignee: carolId, dueDate: daysFromNow(-2), // overdue ←
      createdBy: bobId,
    },
    // Done
    {
      board: sprintBoardId, column: col.done,
      title: 'Project scaffolding & monorepo setup',
      description: 'client/ + server/ under one root. Shared ESLint config. Dockerfile for server.',
      position: 1000, labels: ['infrastructure'],
      assignee: aliceId, dueDate: daysFromNow(-30),
      createdBy: aliceId,
    },
    {
      board: sprintBoardId, column: col.done,
      title: 'MongoDB schema design — all collections',
      description: 'Finalized 7 collections. Documented index strategy. Reviewed embedding vs referencing tradeoffs.',
      position: 2000, labels: ['backend', 'docs'],
      assignee: aliceId, dueDate: daysFromNow(-25),
      createdBy: aliceId,
    },
    {
      board: sprintBoardId, column: col.done,
      title: 'Deploy staging environment on Render',
      description: '',
      position: 3000, labels: ['infrastructure'],
      assignee: bobId, dueDate: daysFromNow(-20),
      createdBy: aliceId,
    },
    {
      board: sprintBoardId, column: col.done,
      title: 'Set up CI/CD — GitHub Actions',
      description: 'Test suite runs on every PR. Deploy to staging on merge to main.',
      position: 4000, labels: ['infrastructure'],
      assignee: bobId, dueDate: daysFromNow(-15),
      createdBy: bobId,
    },
  ]);

  console.log('  ✓ 17 tasks across 5 columns  (includes 2 overdue)');

  // ── Tasks — Design Board (archived) ──────────────────────────────────────
  section('Tasks — Design Exploration (archived)');

  await Task.insertMany([
    {
      board: designBoardId, column: dc.shipped,
      title: 'Logo redesign v2',
      description: 'Delivered final SVG + PNG exports at 1x / 2x / 3x.',
      position: 1000, labels: ['design'],
      assignee: carolId, dueDate: daysFromNow(-60),
      createdBy: aliceId,
    },
    {
      board: designBoardId, column: dc.shipped,
      title: 'Figma component library — atoms',
      description: 'Button, Input, Badge, Avatar, Spinner, Skeleton. Auto-layout throughout.',
      position: 2000, labels: ['design', 'frontend'],
      assignee: carolId, dueDate: daysFromNow(-55),
      createdBy: aliceId,
    },
    {
      board: designBoardId, column: dc.shipped,
      title: 'Brand guidelines document',
      description: '',
      position: 3000, labels: ['design', 'docs'],
      assignee: aliceId, dueDate: daysFromNow(-50),
      createdBy: aliceId,
    },
  ]);

  console.log('  ✓ 3 tasks in archived board');

  // ── Tasks — Beta Studio Feature Board ────────────────────────────────────
  section('Tasks — Feature Requests Board (Beta Studio)');

  await Task.insertMany([
    {
      board: featureBoardId, column: bc.open,
      title: 'Guest access mode — read-only board share link',
      description: 'Unauthenticated viewers get a read-only snapshot. No real-time updates. Link expires in 30 days.',
      position: 1000, labels: ['feature'],
      assignee: null, dueDate: null,
      createdBy: bobId,
    },
    {
      board: featureBoardId, column: bc.open,
      title: 'Keyboard shortcuts cheatsheet',
      description: 'Modal triggered by ? key. Cover: new task (N), search (Cmd+K), move card (Shift+Arrow).',
      position: 2000, labels: ['feature', 'frontend'],
      assignee: carolId, dueDate: daysFromNow(10),
      createdBy: carolId,
    },
    {
      board: featureBoardId, column: bc.progress,
      title: 'Bulk-assign tasks to a team member',
      description: 'Checkbox select on board. Assign all selected to one member in a single API call.',
      position: 1000, labels: ['feature', 'frontend', 'backend'],
      assignee: bobId, dueDate: daysFromNow(4),
      createdBy: bobId,
    },
    {
      board: featureBoardId, column: bc.testing,
      title: 'CSV export of task list',
      description: 'Export all tasks for a board as CSV. Columns: title, column, assignee, labels, dueDate, createdAt.',
      position: 1000, labels: ['feature'],
      assignee: carolId, dueDate: daysFromNow(-3),
      createdBy: carolId,
    },
  ]);

  console.log('  ✓ 4 tasks across 3 columns');

  // ── Activity Logs ────────────────────────────────────────────────────────
  section('Activity Logs');

  /**
   * Build logs in reverse-chronological order — most recent first in the
   * insert array so the createdAt values feel natural.
   *
   * We manually set createdAt so the feed renders a believable history.
   */
  const ago = (days, hours = 0) =>
    new Date(Date.now() - days * 86_400_000 - hours * 3_600_000);

  const alphaLogs = [
    // Org lifecycle
    { organization: alphaId, actor: aliceId, action: 'org.created',
      metadata: { name: 'Alpha Labs' }, createdAt: ago(30) },

    // Member events
    { organization: alphaId, actor: aliceId, action: 'member.invited',
      metadata: { email: 'bob@demo.com', role: 'admin' }, createdAt: ago(29) },
    { organization: alphaId, actor: bobId,   action: 'member.joined',
      metadata: { role: 'admin' }, createdAt: ago(28) },
    { organization: alphaId, actor: aliceId, action: 'member.invited',
      metadata: { email: 'carol@demo.com', role: 'member' }, createdAt: ago(27) },
    { organization: alphaId, actor: carolId, action: 'member.joined',
      metadata: { role: 'member' }, createdAt: ago(26) },
    { organization: alphaId, actor: aliceId, action: 'member.invited',
      metadata: { email: 'dave@demo.com', role: 'member' }, createdAt: ago(25) },
    { organization: alphaId, actor: daveId,  action: 'member.joined',
      metadata: { role: 'member' }, createdAt: ago(24) },
    { organization: alphaId, actor: aliceId, action: 'member.role_changed',
      metadata: { targetUserId: bobId, targetUserName: 'Bob Dlamini', oldRole: 'member', newRole: 'admin' },
      createdAt: ago(22) },

    // Board lifecycle — Sprint Board
    { organization: alphaId, board: sprintBoardId, actor: aliceId, action: 'board.created',
      metadata: { name: 'Q3 Sprint Board' }, createdAt: ago(20) },

    // Board lifecycle — Design Board
    { organization: alphaId, board: designBoardId, actor: aliceId, action: 'board.created',
      metadata: { name: 'Design Exploration' }, createdAt: ago(65) },
    { organization: alphaId, board: designBoardId, actor: aliceId, action: 'board.updated',
      metadata: { changes: { isArchived: true } }, createdAt: ago(45) },

    // Task events — Sprint Board
    { organization: alphaId, board: sprintBoardId, actor: aliceId, action: 'task.created',
      metadata: { title: 'Real-time board sync via Socket.io' }, createdAt: ago(10) },
    { organization: alphaId, board: sprintBoardId, actor: aliceId, action: 'task.assigned',
      metadata: { taskTitle: 'Real-time board sync via Socket.io', assigneeName: 'Alice Nkosi' },
      createdAt: ago(10) },
    { organization: alphaId, board: sprintBoardId, actor: aliceId, action: 'task.created',
      metadata: { title: 'Add Redis caching for org member list' }, createdAt: ago(9) },
    { organization: alphaId, board: sprintBoardId, actor: aliceId, action: 'task.assigned',
      metadata: { taskTitle: 'Add Redis caching for org member list', assigneeName: 'Bob Dlamini' },
      createdAt: ago(9) },
    { organization: alphaId, board: sprintBoardId, actor: bobId,   action: 'task.moved',
      metadata: { taskTitle: 'User authentication — JWT + refresh token rotation', fromColumn: 'In Progress', toColumn: 'In Review' },
      createdAt: ago(5) },
    { organization: alphaId, board: sprintBoardId, actor: carolId, action: 'task.updated',
      metadata: { taskTitle: 'Mobile responsive layout for board view', changes: { dueDate: daysFromNow(-1) } },
      createdAt: ago(3) },
    { organization: alphaId, board: sprintBoardId, actor: aliceId, action: 'task.moved',
      metadata: { taskTitle: 'Set up CI/CD — GitHub Actions', fromColumn: 'In Review', toColumn: 'Done' },
      createdAt: ago(15) },
    { organization: alphaId, board: sprintBoardId, actor: aliceId, action: 'task.deleted',
      metadata: { taskTitle: 'Investigate Sentry integration' }, createdAt: ago(2) },
    { organization: alphaId, board: sprintBoardId, actor: bobId,   action: 'board.updated',
      metadata: { changes: { description: 'Active sprint tracking board for the Q3 product cycle.' } },
      createdAt: ago(1) },
  ];

  const betaLogs = [
    { organization: betaId, actor: bobId,   action: 'org.created',
      metadata: { name: 'Beta Studio' }, createdAt: ago(20) },
    { organization: betaId, actor: bobId,   action: 'member.invited',
      metadata: { email: 'carol@demo.com', role: 'admin' }, createdAt: ago(19) },
    { organization: betaId, actor: carolId, action: 'member.joined',
      metadata: { role: 'admin' }, createdAt: ago(18) },
    { organization: betaId, actor: bobId,   action: 'member.invited',
      metadata: { email: 'alice@demo.com', role: 'member' }, createdAt: ago(17) },
    { organization: betaId, actor: aliceId, action: 'member.joined',
      metadata: { role: 'member' }, createdAt: ago(16) },
    { organization: betaId, board: featureBoardId, actor: bobId, action: 'board.created',
      metadata: { name: 'Feature Requests' }, createdAt: ago(15) },
    { organization: betaId, board: featureBoardId, actor: bobId, action: 'task.created',
      metadata: { title: 'Guest access mode — read-only board share link' }, createdAt: ago(12) },
    { organization: betaId, board: featureBoardId, actor: carolId, action: 'task.created',
      metadata: { title: 'CSV export of task list' }, createdAt: ago(10) },
    { organization: betaId, board: featureBoardId, actor: bobId, action: 'task.moved',
      metadata: { taskTitle: 'CSV export of task list', fromColumn: 'In Progress', toColumn: 'Testing' },
      createdAt: ago(4) },
    { organization: betaId, actor: carolId, action: 'member.removed',
      metadata: { targetUserName: 'Dave Mokoena', targetUserId: daveId }, createdAt: ago(2) },
  ];

  await ActivityLog.insertMany([...alphaLogs, ...betaLogs]);

  console.log(`  ✓ ${alphaLogs.length} Alpha Labs logs · ${betaLogs.length} Beta Studio logs`);

  // ── Invites ──────────────────────────────────────────────────────────────
  section('Invites');

  const pendingTokenAlpha = generateToken(32);
  const pendingTokenBeta  = generateToken(32);

  await Invite.insertMany([
    // Alpha Labs — pending invite (never accepted)
    {
      organization: alphaId,
      email:        'grace@external.com',
      role:         'member',
      tokenHash:    hashToken(pendingTokenAlpha),
      invitedBy:    aliceId,
      expiresAt:    daysFromNow(2),
      acceptedAt:   null,
    },
    // Alpha Labs — second pending invite for a different role
    {
      organization: alphaId,
      email:        'henry@external.com',
      role:         'admin',
      tokenHash:    hashToken(generateToken(32)),
      invitedBy:    bobId,
      expiresAt:    daysFromNow(1),
      acceptedAt:   null,
    },
    // Beta Studio — pending invite
    {
      organization: betaId,
      email:        'irene@external.com',
      role:         'member',
      tokenHash:    hashToken(pendingTokenBeta),
      invitedBy:    bobId,
      expiresAt:    daysFromNow(2),
      acceptedAt:   null,
    },
    // Beta Studio — already accepted (historical record)
    {
      organization: betaId,
      email:        'alice@demo.com',
      role:         'member',
      tokenHash:    hashToken(generateToken(32)),
      invitedBy:    bobId,
      expiresAt:    daysFromNow(30),    // expiry is moot once accepted
      acceptedAt:   daysFromNow(-16),   // accepted 16 days ago
    },
  ]);

  console.log('  ✓ 4 invites  (3 pending · 1 accepted)');

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n' + '━'.repeat(52));
  console.log('  🌱 Seed complete');
  console.log('━'.repeat(52));

  console.log(`
  Credentials (all share the same password)
  ┌──────────────────────────────────────────────────┐
  │  alice@demo.com  │  Password1!  │  owner          │
  │  bob@demo.com    │  Password1!  │  admin           │
  │  carol@demo.com  │  Password1!  │  member          │
  │  dave@demo.com   │  Password1!  │  inactive user   │
  │  eve@demo.com    │  Password1!  │  unverified      │
  │  frank@demo.com  │  Password1!  │  no org          │
  └──────────────────────────────────────────────────┘

  Orgs
    alpha-labs  →  4 members · 2 boards (1 archived) · 17+3 tasks
    beta-studio →  3 members · 1 board  · 4 tasks

  Boards
    Q3 Sprint Board       → active   · 17 tasks (5 cols, 2 overdue)
    Design Exploration    → archived · 3 tasks
    Feature Requests      → active   · 4 tasks

  Activity Logs   ${alphaLogs.length + betaLogs.length} entries across both orgs
  Invites         3 pending · 1 accepted
`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('\n❌ Seed failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
