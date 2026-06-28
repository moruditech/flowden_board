'use strict';

/**
 * seed.reset.js — Wipe every collection in the database.
 *
 * Use before a fresh seed run, or to return to a clean slate in CI.
 * Skips system collections and drops only application-level data.
 *
 * Usage:
 *   node scripts/seed.reset.js
 *   node scripts/seed.reset.js --yes    # skip the 5-second warning pause
 *
 * ⚠  This is IRREVERSIBLE. Never run against a production URI.
 */

require('dotenv').config();

const mongoose = require('mongoose');
const env      = require('../src/config/env');

const MODELS = [
  '../src/shared/models/ActivityLog.model',
  '../src/shared/models/Board.model',
  '../src/shared/models/Invite.model',
  '../src/shared/models/Membership.model',
  '../src/shared/models/Organization.model',
  '../src/shared/models/RefreshToken.model',
  '../src/shared/models/Task.model',
  '../src/shared/models/User.model',
];

async function reset() {
  const skipWarning = process.argv.includes('--yes');

  // ── Safety check ─────────────────────────────────────────────────────────
  if (env.NODE_ENV === 'production') {
    console.error('❌  Refusing to reset a production database. NODE_ENV=production detected.');
    process.exit(1);
  }

  const uri = env.MONGO_URI;
  console.log(`\n  Target: ${uri}`);
  console.log(`  NODE_ENV: ${env.NODE_ENV}`);

  if (!skipWarning) {
    console.log('\n  ⚠️  This will permanently delete ALL data in every collection.');
    console.log('     Run with --yes to skip this pause, or Ctrl-C to abort.\n');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // ── Connect & load models ─────────────────────────────────────────────────
  await mongoose.connect(uri);
  console.log('✅ Connected');

  // Importing models registers their schemas so mongoose knows the collection names
  MODELS.forEach((m) => require(m));

  // ── Drop each collection ──────────────────────────────────────────────────
  const results = [];

  for (const [name, model] of Object.entries(mongoose.models)) {
    try {
      const { deletedCount } = await model.deleteMany({});
      results.push({ name, deletedCount, ok: true });
    } catch (err) {
      results.push({ name, error: err.message, ok: false });
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────
  console.log('\n  Collection          Deleted');
  console.log('  ' + '─'.repeat(36));

  for (const r of results.sort((a, b) => a.name.localeCompare(b.name))) {
    if (r.ok) {
      const col   = r.name.padEnd(20);
      const count = String(r.deletedCount).padStart(6);
      console.log(`  ${col}  ${count} docs`);
    } else {
      console.log(`  ${r.name.padEnd(20)}  ❌ ${r.error}`);
    }
  }

  const total = results.filter((r) => r.ok).reduce((s, r) => s + r.deletedCount, 0);
  const failed = results.filter((r) => !r.ok).length;

  console.log('  ' + '─'.repeat(36));
  console.log(`  Total               ${String(total).padStart(6)} docs removed`);
  if (failed) console.log(`  ⚠️  ${failed} collection(s) had errors`);

  console.log('\n  ✅ Reset complete — run `npm run seed` to populate test data.\n');

  await mongoose.disconnect();
  process.exit(failed ? 1 : 0);
}

reset().catch((err) => {
  console.error('\n❌ Reset failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
