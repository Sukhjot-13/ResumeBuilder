#!/usr/bin/env node

/**
 * Free-tier sync — grants the trial permissions to the USER role without
 * wiping any custom admin permission edits (unlike a full seed re-run,
 * which overwrites every role's permission array).
 *
 * Grants: generate_resume, view_own_resumes (requiredPlan -> FREE)
 * Usage: node scripts/sync-free-tier.mjs [--dry-run]
 * The MONGODB_URI env var must be set (or it reads from .env.local).
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

const GRANTS = ['generate_resume', 'view_own_resumes'];

await mongoose.connect(MONGODB_URI);
console.log('Connected to DB');

const Role = mongoose.models.Role || mongoose.model('Role', new mongoose.Schema({
  name: { type: String }, value: { type: Number, unique: true },
  permissions: { type: [String], default: [] }, isAdmin: { type: Boolean, default: false },
}));
const Permission = mongoose.models.Permission || mongoose.model('Permission', new mongoose.Schema({
  key: { type: String, unique: true }, requiredPlan: { type: String },
}));

const userRole = await Role.findOne({ value: 100 }).lean();
if (!userRole) {
  console.error('USER role (value 100) not found — run node scripts/seed.mjs first.');
  process.exit(1);
}
const missing = GRANTS.filter((p) => !(userRole.permissions || []).includes(p));
console.log(`USER role currently has ${userRole.permissions?.length ?? 0} permissions; missing: ${missing.join(', ') || 'none'}`);

if (!DRY_RUN) {
  if (missing.length > 0) {
    await Role.updateOne({ value: 100 }, { $addToSet: { permissions: { $each: missing } } });
    console.log(`Added to USER role: ${missing.join(', ')}`);
  }
  for (const key of GRANTS) {
    await Permission.updateOne({ key }, { $set: { requiredPlan: 'FREE' } });
  }
  console.log('Permission requiredPlan set to FREE for: ' + GRANTS.join(', '));
} else {
  console.log('[dry-run] no changes written');
}

await mongoose.disconnect();
console.log('Done');
