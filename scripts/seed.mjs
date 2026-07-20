#!/usr/bin/env node

/**
 * Seed runner — standalone, no Next.js aliases or dotenv needed.
 * Usage: node scripts/seed.mjs
 * The MONGODB_URI env var must be set (or it reads from .env.local).
 */

import fs from 'fs';
import mongoose from 'mongoose';

// Try to read MONGODB_URI from .env.local if not already set
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
console.log('Connected to DB');

// ── Permission Schema / Model (inline, no alias) ──────────────────────────
const permissionSchema = new mongoose.Schema({
  key:         { type: String, required: true, unique: true },
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  group:       { type: String, default: 'General' },
  requiredPlan:{ type: String, default: 'FREE' },
});
const Permission = mongoose.models.Permission || mongoose.model('Permission', permissionSchema);

// ── Role Schema / Model (inline, no alias) ─────────────────────────────────
const roleSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  value:       { type: Number, required: true, unique: true },
  permissions: { type: [String], default: [] },
  isAdmin:     { type: Boolean, default: false },
  description: { type: String, default: '' },
});
const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);

// ── Permission & role data (mirrors constants.js) ──────────────────────────
const PERMISSION_METADATA = {
  view_users:              { name: "View Users", description: "View all registered users and their details.", requiredPlan: "DEVELOPER" },
  manage_users:            { name: "Manage Users", description: "Ban, delete user accounts.", requiredPlan: "DEVELOPER" },
  change_user_role:        { name: "Change User Role", description: "Promote or demote user roles.", requiredPlan: "DEVELOPER" },
  view_all_subscriptions:  { name: "View All Subscriptions", description: "View subscription status for all users.", requiredPlan: "DEVELOPER" },
  manage_credits:          { name: "Manage Credits", description: "Manually add or reset user credits.", requiredPlan: "DEVELOPER" },
  unlimited_credits:       { name: "Unlimited Credits", description: "Bypass all credit limits.", requiredPlan: "DEVELOPER" },
  view_analytics:          { name: "View Analytics", description: "Access analytics and usage statistics.", requiredPlan: "DEVELOPER" },
  access_admin_panel:      { name: "Admin Panel Access", description: "Access the administrative control panel.", requiredPlan: "DEVELOPER" },
  delete_user:             { name: "Delete User", description: "Permanently delete user accounts.", requiredPlan: "DEVELOPER" },
  manage_roles:            { name: "Manage Roles", description: "Create, edit, and delete roles and their permissions.", requiredPlan: "DEVELOPER" },
  generate_resume:         { name: "AI Resume Generation", description: "Generate tailored resumes from job descriptions using AI.", requiredPlan: "PRO" },
  edit_resume_with_ai:     { name: "AI Resume Editor", description: "Edit and improve your resume with AI.", requiredPlan: "PRO" },
  create_new_resume_on_edit:{ name: "Version Control", description: "Create unlimited versions of your resume.", requiredPlan: "PRO" },
  use_special_instructions:{ name: "Custom AI Instructions", description: "Provide specific AI instructions.", requiredPlan: "PRO" },
  parse_resume:            { name: "AI Resume Parsing", description: "Upload and parse resume files.", requiredPlan: "PRO" },
  create_resume:           { name: "Create Resume", description: "Create a new resume from scratch.", requiredPlan: "FREE" },
  view_own_resumes:        { name: "View Saved Resumes", description: "Access your resume library.", requiredPlan: "PRO" },
  delete_own_resume:       { name: "Delete Resumes", description: "Remove resumes from your library.", requiredPlan: "FREE" },
  edit_resume_metadata:    { name: "Edit Resume Details", description: "Update job title and company name.", requiredPlan: "PRO" },
  download_pdf:            { name: "PDF Download", description: "Download resumes as PDF.", requiredPlan: "FREE" },
  generate_cover_letter:   { name: "AI Cover Letter Generation", description: "Generate cover letters from job descriptions.", requiredPlan: "PRO" },
  view_cover_letters:      { name: "View Cover Letters", description: "Access your cover letter library.", requiredPlan: "PRO" },
  edit_cover_letter:       { name: "Edit Cover Letter", description: "Edit existing cover letters.", requiredPlan: "PRO" },
  delete_cover_letter:     { name: "Delete Cover Letters", description: "Remove cover letters from your library.", requiredPlan: "PRO" },
  view_own_profile:        { name: "View Profile", description: "Access your profile information.", requiredPlan: "FREE" },
  edit_own_profile:        { name: "Edit Profile", description: "Update your personal details.", requiredPlan: "FREE" },
  upload_main_resume:      { name: "Upload Master Resume", description: "Upload and maintain your primary resume.", requiredPlan: "FREE" },
  access_ai_edit_page:     { name: "AI Edit Access", description: "Access the AI-powered editor page.", requiredPlan: "PRO" },
  view_own_subscription:   { name: "View Subscription", description: "Check your subscription status.", requiredPlan: "FREE" },
  manage_own_subscription: { name: "Manage Subscription", description: "Upgrade or cancel your subscription.", requiredPlan: "FREE" },
  view_automation:         { name: "Automation Dashboard", description: "Access job automation dashboard.", requiredPlan: "PRO" },
  manage_scheduler:        { name: "Schedule Manager", description: "Configure automation schedule.", requiredPlan: "PRO" },
  manage_platform_sessions:{ name: "Platform Sessions", description: "Manage LinkedIn/Indeed sessions.", requiredPlan: "PRO" },
  manage_criteria:         { name: "Job Search Criteria", description: "Configure job search filters.", requiredPlan: "PRO" },
  manage_gatekeeper_rules: { name: "Gatekeeper Rules", description: "Configure AI gatekeeper rules.", requiredPlan: "PRO" },
  manage_api_keys:         { name: "Manage API Keys", description: "Create/revoke API keys.", requiredPlan: "PRO" },
  view_applications:       { name: "View Applications", description: "View application history.", requiredPlan: "PRO" },
  emergency_stop:          { name: "Emergency Stop", description: "Pause all automation immediately.", requiredPlan: "PRO" },
};

const ROLES = { ADMIN: 0, DEVELOPER: 70, SUBSCRIBER: 99, USER: 100 };
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]:      ['ALL'],
  [ROLES.DEVELOPER]:  [
    'view_own_profile','edit_own_profile','upload_main_resume','create_resume','delete_own_resume',
    'download_pdf','view_own_subscription','manage_own_subscription',
    'generate_resume','edit_resume_with_ai','create_new_resume_on_edit','use_special_instructions',
    'parse_resume','generate_cover_letter','view_cover_letters','edit_cover_letter','delete_cover_letter',
    'view_own_resumes','edit_resume_metadata','access_ai_edit_page',
    'view_automation','manage_scheduler','manage_platform_sessions','manage_criteria',
    'manage_gatekeeper_rules','manage_api_keys','view_applications','emergency_stop',
    'view_users','view_analytics','access_admin_panel','view_all_subscriptions','manage_roles',
  ],
  [ROLES.SUBSCRIBER]: [
    'view_own_profile','edit_own_profile','upload_main_resume','create_resume','delete_own_resume',
    'download_pdf','view_own_subscription','manage_own_subscription',
    'generate_resume','edit_resume_with_ai','create_new_resume_on_edit','use_special_instructions',
    'parse_resume','generate_cover_letter','view_cover_letters','edit_cover_letter','delete_cover_letter',
    'view_own_resumes','edit_resume_metadata','access_ai_edit_page',
    'view_automation','manage_scheduler','manage_platform_sessions','manage_criteria',
    'manage_gatekeeper_rules','manage_api_keys','view_applications','emergency_stop',
  ],
  [ROLES.USER]: [
    'view_own_profile','edit_own_profile','upload_main_resume','create_resume','delete_own_resume',
    'download_pdf','view_own_subscription','manage_own_subscription',
  ],
};

function deriveGroup(key) {
  const adminKeys = ['view_users','manage_users','change_user_role','view_all_subscriptions','manage_credits','unlimited_credits','view_analytics','access_admin_panel','delete_user','manage_roles'];
  const aiKeys = ['generate_resume','edit_resume_with_ai','create_new_resume_on_edit','use_special_instructions','parse_resume'];
  const resumeKeys = ['create_resume','view_own_resumes','delete_own_resume','edit_resume_metadata','download_pdf'];
  const coverLetterKeys = ['generate_cover_letter','view_cover_letters','edit_cover_letter','delete_cover_letter'];
  const profileKeys = ['view_own_profile','edit_own_profile','upload_main_resume','access_ai_edit_page'];
  const billingKeys = ['view_own_subscription','manage_own_subscription'];
  const automationKeys = ['view_automation','manage_scheduler','manage_platform_sessions','manage_criteria','manage_gatekeeper_rules','manage_api_keys','view_applications','emergency_stop'];
  if (adminKeys.includes(key)) return 'Admin';
  if (aiKeys.includes(key)) return 'AI & Content';
  if (resumeKeys.includes(key)) return 'Resume';
  if (coverLetterKeys.includes(key)) return 'Cover Letter';
  if (profileKeys.includes(key)) return 'Profile';
  if (billingKeys.includes(key)) return 'Billing';
  if (automationKeys.includes(key)) return 'Automation';
  return 'General';
}

// ── Seed ──────────────────────────────────────────────────────────────────
let count = 0;
for (const [key, meta] of Object.entries(PERMISSION_METADATA)) {
  await Permission.updateOne(
    { key },
    { $set: { key, name: meta.name, description: meta.description, group: deriveGroup(key), requiredPlan: meta.requiredPlan } },
    { upsert: true }
  );
  count++;
}
console.log(`Seeded ${count} permissions`);

const roleEntries = [
  { name: 'ADMIN', value: 0, permissions: ['ALL'], isAdmin: true, description: 'Full system access' },
  { name: 'DEVELOPER', value: 70, permissions: ROLE_PERMISSIONS[70], isAdmin: false, description: 'Developer-level access with admin panel' },
  { name: 'SUBSCRIBER', value: 99, permissions: ROLE_PERMISSIONS[99], isAdmin: false, description: 'Pro subscriber with all features' },
  { name: 'USER', value: 100, permissions: ROLE_PERMISSIONS[100], isAdmin: false, description: 'Free tier user with basic features' },
];

for (const role of roleEntries) {
  await Role.updateOne({ value: role.value }, { $set: role }, { upsert: true });
}
console.log('Seeded 4 roles');
console.log('Seed complete');

await mongoose.disconnect();
