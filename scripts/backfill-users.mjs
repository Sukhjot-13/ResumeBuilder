#!/usr/bin/env node

/**
 * One-time data migration (2026-08-22 audit follow-ups):
 *   1. Lowercase + trim all user emails (M1 — new writes are normalized at
 *      the OTP routes; this fixes existing rows so casing can't split accounts).
 *   2. Clear stale `subscriptionId` on users who are NOT active subscribers
 *      (H2 backfill — a leftover subscriptionId must not grant Pro limits).
 *
 * Idempotent: safe to re-run.
 * Usage: node scripts/backfill-users.mjs [--dry-run]
 * Reads MONGODB_URI from the environment or .env.local.
 */

import fs from 'fs';
import mongoose from 'mongoose';

const DRY_RUN = process.argv.includes('--dry-run');

let MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const match = envContent.match(/MONGODB_URI=(.+)/);
    if (match) MONGODB_URI = match[1].trim();
  } catch {}
}

if (!MONGODB_URI) {
  console.error('MONGODB_URI not set. Pass it as MONGODB_URI=... or add to .env.local');
  process.exit(1);
}

await mongoose.connect(MONGODB_URI);
console.log(`Connected to DB${DRY_RUN ? ' (dry run — no writes)' : ''}`);

const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const User = mongoose.models.User || mongoose.model('User', userSchema);

const ROLES = { SUBSCRIBER: 99 };

// ── 1. Email casing ──────────────────────────────────────────────────────────
const emailCandidates = await User.find({
  $expr: { $ne: [{ $toLower: { $trim: { input: '$email' } } }, '$email'] },
})
  .select('email')
  .lean();

let emailsFixed = 0;
for (const u of emailCandidates) {
  const normalized = String(u.email).trim().toLowerCase();
  if (!normalized) continue;

  // Collision check: another account may already own the lowercase form.
  const collision = await User.findOne({
    _id: { $ne: u._id },
    email: normalized,
  }).lean();

  if (collision) {
    console.warn(
      `⚠️  Skipping ${u.email} → ${normalized}: another account already uses the lowercase form. Merge manually.`
    );
    continue;
  }

  if (!DRY_RUN) {
    await User.updateOne({ _id: u._id }, { $set: { email: normalized } });
  }
  emailsFixed++;
  console.log(`email: ${u.email} → ${normalized}`);
}
console.log(`${emailsFixed} email(s) ${DRY_RUN ? 'would be ' : ''}normalized`);

// ── 2. Stale subscriptionId on non-subscribers ───────────────────────────────
const staleCandidates = await User.find({
  subscriptionId: { $nin: [null, ''] },
  $or: [
    { role: { $ne: ROLES.SUBSCRIBER } },
    { subscriptionStatus: { $nin: ['active', null] } },
  ],
})
  .select('role subscriptionStatus subscriptionExpiresAt')
  .lean();

// Guard: keep rows whose paid-through window hasn't passed yet even if the
// periodic checker hasn't downgraded them yet (it will soon).
const now = Date.now();
let subsCleared = 0;
for (const u of staleCandidates) {
  const expiry = u.subscriptionExpiresAt ? new Date(u.subscriptionExpiresAt).getTime() : 0;
  const withinPaidThrough = expiry > now;
  if (withinPaidThrough) continue; // checker will downgrade after expiry passes

  if (!DRY_RUN) {
    await User.updateOne({ _id: u._id }, { $unset: { subscriptionId: 1 } });
  }
  subsCleared++;
  console.log(
    `subscriptionId cleared for user ${u._id} (role=${u.role}, status=${u.subscriptionStatus})`
  );
}
console.log(`${subsCleared} stale subscriptionId(s) ${DRY_RUN ? 'would be ' : ''}cleared`);

console.log(DRY_RUN ? 'Dry run complete — re-run without --dry-run to apply.' : 'Migration complete.');
await mongoose.disconnect();
