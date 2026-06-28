'use strict';

require('dotenv').config();

const mongoose   = require('mongoose');
const env        = require('../src/config/env');
const { hashPassword } = require('../src/shared/utils/bcrypt');

// Models must be imported AFTER mongoose connects
async function seed() {
  await mongoose.connect(env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const User         = require('../src/shared/models/User.model');
  const Organization = require('../src/shared/models/Organization.model');
  const Membership   = require('../src/shared/models/Membership.model');
  const Board        = require('../src/shared/models/Board.model');
  const Task         = require('../src/shared/models/Task.model');

  // ── Wipe existing seed data ─────────────────────────────────────────────
  await Promise.all([
    User.deleteMany({ email: { $in: ['alice@demo.com', 'bob@demo.com'] } }),
    Organization.deleteMany({ slug: 'demo-workspace' }),
  ]);

  // ── Users ───────────────────────────────────────────────────────────────
  const passwordHash = await hashPassword('Password1!');

  const alice = await User.create({
    name:          'Alice Demo',
    email:         'alice@demo.com',
    passwordHash,
    emailVerified: true,
  });

  const bob = await User.create({
    name:          'Bob Demo',
    email:         'bob@demo.com',
    passwordHash,
    emailVerified: true,
  });

  console.log('✅ Users created');

  // ── Organization ────────────────────────────────────────────────────────
  const org = await Organization.create({
    name:        'Demo Workspace',
    slug:        'demo-workspace',
    description: 'A sample organization created by the seed script',
    createdBy:   alice._id,
  });

  await Membership.create({ user: alice._id, organization: org._id, role: 'owner' });
  await Membership.create({ user: bob._id,   organization: org._id, role: 'admin' });

  console.log('✅ Organization created');

  // ── Board ────────────────────────────────────────────────────────────────
  const todoId       = new mongoose.Types.ObjectId();
  const inProgressId = new mongoose.Types.ObjectId();
  const reviewId     = new mongoose.Types.ObjectId();
  const doneId       = new mongoose.Types.ObjectId();

  const board = await Board.create({
    organization: org._id,
    name:         'Product Roadmap',
    description:  'High-level feature planning board',
    columns: [
      { _id: todoId,       name: 'To Do',       order: 0 },
      { _id: inProgressId, name: 'In Progress', order: 1 },
      { _id: reviewId,     name: 'In Review',   order: 2 },
      { _id: doneId,       name: 'Done',        order: 3 },
    ],
    createdBy: alice._id,
  });

  console.log('✅ Board created');

  // ── Tasks ────────────────────────────────────────────────────────────────
  const tasks = [
    { column: todoId,       title: 'Set up CI/CD pipeline',            position: 1000, assignee: bob._id },
    { column: todoId,       title: 'Write API documentation',           position: 2000, assignee: null },
    { column: todoId,       title: 'Design email templates',            position: 3000, assignee: alice._id },
    { column: inProgressId, title: 'Implement real-time board sync',    position: 1000, assignee: alice._id },
    { column: inProgressId, title: 'Add Redis caching layer',           position: 2000, assignee: bob._id },
    { column: reviewId,     title: 'User authentication flow',          position: 1000, assignee: alice._id },
    { column: reviewId,     title: 'Org invite system',                 position: 2000, assignee: bob._id },
    { column: doneId,       title: 'Project scaffolding & monorepo',    position: 1000, assignee: alice._id },
    { column: doneId,       title: 'Database schema design',            position: 2000, assignee: bob._id },
    { column: doneId,       title: 'Deploy staging environment',        position: 3000, assignee: alice._id },
  ];

  await Task.insertMany(tasks.map((t) => ({
    board:     board._id,
    column:    t.column,
    title:     t.title,
    position:  t.position,
    assignee:  t.assignee,
    createdBy: alice._id,
  })));

  console.log('✅ Tasks created');

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🌱 Seed complete');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Org:   Demo Workspace (slug: demo-workspace)');
  console.log('  Board: Product Roadmap (10 tasks)');
  console.log('');
  console.log('  Login credentials:');
  console.log('  ┌─────────────────────────────────┐');
  console.log('  │  alice@demo.com  /  Password1!  │  (owner)');
  console.log('  │  bob@demo.com    /  Password1!  │  (admin)');
  console.log('  └─────────────────────────────────┘');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
