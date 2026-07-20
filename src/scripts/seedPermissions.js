/**
 * Seed script: Populates Permission and Role collections from constants.js
 *
 * Usage:
 *   node src/scripts/seedPermissions.js
 *
 * Safe to re-run (idempotent — uses upsert).
 * Must be run after models are created and DB is connected.
 */

// Use tsx or node with --experimental-modules depending on project setup
// This file uses ES module syntax matching the project

import dbConnect from '../lib/mongodb.js';
import Permission from '../models/Permission.js';
import Role from '../models/Role.js';
import { PERMISSION_METADATA, ROLE_PERMISSIONS, ROLES } from '../lib/constants.js';

function deriveGroup(key) {
  const adminKeys = ['view_users', 'manage_users', 'change_user_role', 'view_all_subscriptions',
    'manage_credits', 'unlimited_credits', 'view_analytics', 'access_admin_panel', 'delete_user', 'manage_roles'];
  const aiKeys = ['generate_resume', 'edit_resume_with_ai', 'create_new_resume_on_edit',
    'use_special_instructions', 'parse_resume'];
  const resumeKeys = ['create_resume', 'view_own_resumes', 'delete_own_resume', 'edit_resume_metadata', 'download_pdf'];
  const coverLetterKeys = ['generate_cover_letter', 'view_cover_letters', 'edit_cover_letter', 'delete_cover_letter'];
  const profileKeys = ['view_own_profile', 'edit_own_profile', 'upload_main_resume', 'access_ai_edit_page'];
  const billingKeys = ['view_own_subscription', 'manage_own_subscription'];
  const automationKeys = ['view_automation', 'manage_scheduler', 'manage_platform_sessions',
    'manage_criteria', 'manage_gatekeeper_rules', 'manage_api_keys', 'view_applications', 'emergency_stop'];

  if (adminKeys.includes(key)) return 'Admin';
  if (aiKeys.includes(key)) return 'AI & Content';
  if (resumeKeys.includes(key)) return 'Resume';
  if (coverLetterKeys.includes(key)) return 'Cover Letter';
  if (profileKeys.includes(key)) return 'Profile';
  if (billingKeys.includes(key)) return 'Billing';
  if (automationKeys.includes(key)) return 'Automation';
  return 'General';
}

async function seed() {
  console.log('Connecting to database...');
  await dbConnect();
  console.log('Connected to DB');

  // Seed Permission documents
  let count = 0;
  for (const [key, meta] of Object.entries(PERMISSION_METADATA)) {
    await Permission.updateOne(
      { key },
      {
        $set: {
          key,
          name: meta.name,
          description: meta.description,
          group: deriveGroup(key),
          requiredPlan: meta.requiredPlan,
        },
      },
      { upsert: true }
    );
    count++;
  }
  console.log(`Seeded ${count} permissions`);

  // Seed Role documents
  const roleEntries = [
    {
      name: 'ADMIN',
      value: ROLES.ADMIN,
      permissions: ['ALL'],
      isAdmin: true,
      description: 'Full system access',
    },
    {
      name: 'DEVELOPER',
      value: ROLES.DEVELOPER,
      permissions: ROLE_PERMISSIONS[ROLES.DEVELOPER],
      isAdmin: false,
      description: 'Developer-level access with admin panel',
    },
    {
      name: 'SUBSCRIBER',
      value: ROLES.SUBSCRIBER,
      permissions: ROLE_PERMISSIONS[ROLES.SUBSCRIBER],
      isAdmin: false,
      description: 'Pro subscriber with all features',
    },
    {
      name: 'USER',
      value: ROLES.USER,
      permissions: ROLE_PERMISSIONS[ROLES.USER],
      isAdmin: false,
      description: 'Free tier user with basic features',
    },
  ];

  for (const role of roleEntries) {
    await Role.updateOne(
      { value: role.value },
      { $set: role },
      { upsert: true }
    );
  }
  console.log('Seeded 4 roles');

  console.log('Seed complete');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
