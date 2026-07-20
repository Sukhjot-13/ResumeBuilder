export const ROLES = {
  ADMIN: 0,
  DEVELOPER: 70,
  SUBSCRIBER: 99,
  USER: 100,
};

export const PERMISSIONS = {
  // ==========================================
  // Admin & System Management
  // ==========================================
  VIEW_USERS: 'view_users',
  MANAGE_USERS: 'manage_users', // Ban, delete users
  CHANGE_USER_ROLE: 'change_user_role',
  VIEW_ALL_SUBSCRIPTIONS: 'view_all_subscriptions',
  MANAGE_CREDITS: 'manage_credits', // Manually add/reset credits
  UNLIMITED_CREDITS: 'unlimited_credits', // Bypass all credit limits
  VIEW_ANALYTICS: 'view_analytics',
  ACCESS_ADMIN_PANEL: 'access_admin_panel',
  DELETE_USER: 'delete_user', // Permanently delete user accounts
  MANAGE_ROLES: 'manage_roles', // Create, edit, delete roles and their permissions
  
  // ==========================================
  // AI & Content Generation Features
  // ==========================================
  GENERATE_RESUME: 'generate_resume', // Generate tailored resume from job description
  EDIT_RESUME_WITH_AI: 'edit_resume_with_ai', // Edit existing resume with AI
  CREATE_NEW_RESUME_ON_EDIT: 'create_new_resume_on_edit', // Save AI edit as new version
  USE_SPECIAL_INSTRUCTIONS: 'use_special_instructions', // Provide custom AI instructions
  PARSE_RESUME: 'parse_resume', // Upload & parse resume files
  
  // ==========================================
  // Resume Management
  // ==========================================
  CREATE_RESUME: 'create_resume', // Create new resume manually
  VIEW_OWN_RESUMES: 'view_own_resumes', // View own resume list
  DELETE_OWN_RESUME: 'delete_own_resume', // Delete own resumes
  EDIT_RESUME_METADATA: 'edit_resume_metadata', // Edit job title, company name
  DOWNLOAD_PDF: 'download_pdf', // Export resume as PDF
  
  // ==========================================
  // Cover Letter
  // ==========================================
  GENERATE_COVER_LETTER: 'generate_cover_letter', // Generate cover letter from job description
  VIEW_COVER_LETTERS: 'view_cover_letters', // View own cover letters list
  EDIT_COVER_LETTER: 'edit_cover_letter', // Edit/save existing cover letters
  DELETE_COVER_LETTER: 'delete_cover_letter', // Delete own cover letters

  // ==========================================
  // Profile & Account Management
  // ==========================================
  VIEW_OWN_PROFILE: 'view_own_profile',
  EDIT_OWN_PROFILE: 'edit_own_profile',
  UPLOAD_MAIN_RESUME: 'upload_main_resume', // Upload/update main resume
  ACCESS_AI_EDIT_PAGE: 'access_ai_edit_page', // View AI Edit page in navigation
  
  // ==========================================
  // Subscription & Billing
  // ==========================================
  VIEW_OWN_SUBSCRIPTION: 'view_own_subscription',
  MANAGE_OWN_SUBSCRIPTION: 'manage_own_subscription', // Upgrade, cancel subscription

  // ==========================================
  // Job Automation
  // ==========================================
  VIEW_AUTOMATION: 'view_automation', // Access automation dashboard
  MANAGE_SCHEDULER: 'manage_scheduler', // Configure automation schedule
  MANAGE_PLATFORM_SESSIONS: 'manage_platform_sessions', // Add/edit LinkedIn/Indeed cookies
  MANAGE_CRITERIA: 'manage_criteria', // Job search filters
  MANAGE_GATEKEEPER_RULES: 'manage_gatekeeper_rules', // Configure gatekeeper AI
  MANAGE_API_KEYS: 'manage_api_keys', // Create/revoke API keys
  VIEW_APPLICATIONS: 'view_applications', // View application history
  EMERGENCY_STOP: 'emergency_stop', // Pause all automation immediately
};

// ── Base permissions that ALL roles get ──────────────────────────────────
const BASE_PERMISSIONS = [
  PERMISSIONS.VIEW_OWN_PROFILE,
  PERMISSIONS.EDIT_OWN_PROFILE,
  PERMISSIONS.UPLOAD_MAIN_RESUME,
  PERMISSIONS.CREATE_RESUME,
  PERMISSIONS.DELETE_OWN_RESUME,
  PERMISSIONS.DOWNLOAD_PDF,
  PERMISSIONS.VIEW_OWN_SUBSCRIPTION,
  PERMISSIONS.MANAGE_OWN_SUBSCRIPTION,
];

// ── Pro-tier permissions (added on top of base) ─────────────────────────
const PRO_PERMISSIONS = [
  PERMISSIONS.GENERATE_RESUME,
  PERMISSIONS.EDIT_RESUME_WITH_AI,
  PERMISSIONS.CREATE_NEW_RESUME_ON_EDIT,
  PERMISSIONS.USE_SPECIAL_INSTRUCTIONS,
  PERMISSIONS.PARSE_RESUME,
  PERMISSIONS.GENERATE_COVER_LETTER,
  PERMISSIONS.VIEW_COVER_LETTERS,
  PERMISSIONS.EDIT_COVER_LETTER,
  PERMISSIONS.DELETE_COVER_LETTER,
  PERMISSIONS.VIEW_OWN_RESUMES,
  PERMISSIONS.EDIT_RESUME_METADATA,
  PERMISSIONS.ACCESS_AI_EDIT_PAGE,
  // Automation
  PERMISSIONS.VIEW_AUTOMATION,
  PERMISSIONS.MANAGE_SCHEDULER,
  PERMISSIONS.MANAGE_PLATFORM_SESSIONS,
  PERMISSIONS.MANAGE_CRITERIA,
  PERMISSIONS.MANAGE_GATEKEEPER_RULES,
  PERMISSIONS.MANAGE_API_KEYS,
  PERMISSIONS.VIEW_APPLICATIONS,
  PERMISSIONS.EMERGENCY_STOP,
];

// ── Developer-tier permissions (added on top of pro) ─────────────────────
const DEVELOPER_PERMISSIONS = [
  PERMISSIONS.VIEW_USERS,
  PERMISSIONS.VIEW_ANALYTICS,
  PERMISSIONS.ACCESS_ADMIN_PANEL,
  PERMISSIONS.VIEW_ALL_SUBSCRIPTIONS,
  PERMISSIONS.MANAGE_ROLES,
];

export const ROLE_PERMISSIONS = {
  // ADMIN uses 'ALL' wildcard — any permission check returns true.
  // See hasPermission() in accessControl.js for the wildcard logic.
  [ROLES.ADMIN]: ['ALL'],
  [ROLES.DEVELOPER]: [
    ...BASE_PERMISSIONS,
    ...PRO_PERMISSIONS,
    ...DEVELOPER_PERMISSIONS,
  ],
  [ROLES.SUBSCRIBER]: [
    ...BASE_PERMISSIONS,
    ...PRO_PERMISSIONS,
  ],
  [ROLES.USER]: [
    ...BASE_PERMISSIONS,
    // Note: NO AI features for free users
  ],
};

export const PERMISSION_METADATA = {
  // ── Base / Free permissions ──────────────────────────────────────────────
  [PERMISSIONS.VIEW_OWN_PROFILE]: {
    name: "View Profile",
    description: "Access your profile information and personal details.",
    requiredPlan: "FREE"
  },
  [PERMISSIONS.EDIT_OWN_PROFILE]: {
    name: "Edit Profile",
    description: "Update your personal details, name, email, and preferences.",
    requiredPlan: "FREE"
  },
  [PERMISSIONS.UPLOAD_MAIN_RESUME]: {
    name: "Upload Master Resume",
    description: "Upload and maintain your primary resume document.",
    requiredPlan: "FREE"
  },
  [PERMISSIONS.CREATE_RESUME]: {
    name: "Create Resume",
    description: "Create a new resume from scratch using the manual editor.",
    requiredPlan: "FREE"
  },
  [PERMISSIONS.DELETE_OWN_RESUME]: {
    name: "Delete Resumes",
    description: "Remove resumes from your library.",
    requiredPlan: "FREE"
  },
  [PERMISSIONS.DOWNLOAD_PDF]: {
    name: "PDF Download",
    description: "Download your resumes as professionally formatted PDF files.",
    requiredPlan: "FREE"
  },
  [PERMISSIONS.VIEW_OWN_SUBSCRIPTION]: {
    name: "View Subscription",
    description: "Check your subscription status, plan details, and credit balance.",
    requiredPlan: "FREE"
  },
  [PERMISSIONS.MANAGE_OWN_SUBSCRIPTION]: {
    name: "Manage Subscription",
    description: "Upgrade, cancel, or change your subscription plan.",
    requiredPlan: "FREE"
  },

  // ── Pro permissions ──────────────────────────────────────────────────────
  [PERMISSIONS.GENERATE_RESUME]: {
    name: "AI Resume Generation",
    description: "Generate tailored resumes from job descriptions using advanced AI.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.EDIT_RESUME_WITH_AI]: {
    name: "AI Resume Editor",
    description: "Unlock the full power of AI to edit and improve your resume instantly.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.CREATE_NEW_RESUME_ON_EDIT]: {
    name: "Version Control",
    description: "Create unlimited versions of your resume tailored to specific job applications.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.USE_SPECIAL_INSTRUCTIONS]: {
    name: "Custom AI Instructions",
    description: "Provide specific instructions to the AI for more personalized resume generation.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.PARSE_RESUME]: {
    name: "AI Resume Parsing",
    description: "Upload your existing resume and let our AI extract your details instantly.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.GENERATE_COVER_LETTER]: {
    name: "AI Cover Letter Generation",
    description: "Generate tailored cover letters from job descriptions using AI.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.VIEW_COVER_LETTERS]: {
    name: "View Cover Letters",
    description: "Access your library of generated and saved cover letters.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.EDIT_COVER_LETTER]: {
    name: "Edit Cover Letter",
    description: "Edit and update existing cover letters.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.DELETE_COVER_LETTER]: {
    name: "Delete Cover Letters",
    description: "Remove cover letters from your library.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.VIEW_OWN_RESUMES]: {
    name: "View Saved Resumes",
    description: "Access your library of generated and saved resumes.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.EDIT_RESUME_METADATA]: {
    name: "Edit Resume Details",
    description: "Update job title and company name for your saved resumes.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.ACCESS_AI_EDIT_PAGE]: {
    name: "AI Edit Access",
    description: "Access the AI-powered resume editor page.",
    requiredPlan: "PRO"
  },
  // Automation
  [PERMISSIONS.VIEW_AUTOMATION]: {
    name: "Automation Dashboard",
    description: "Access the job automation dashboard and monitor applications.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.MANAGE_SCHEDULER]: {
    name: "Schedule Manager",
    description: "Configure and manage your automation schedule and timing.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.MANAGE_PLATFORM_SESSIONS]: {
    name: "Platform Sessions",
    description: "Manage LinkedIn, Indeed, and other job platform sessions and cookies.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.MANAGE_CRITERIA]: {
    name: "Job Search Criteria",
    description: "Configure your job search filters, salary range, and preferences.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.MANAGE_GATEKEEPER_RULES]: {
    name: "Gatekeeper Rules",
    description: "Configure AI gatekeeper rules to filter job applications automatically.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.MANAGE_API_KEYS]: {
    name: "API Key Management",
    description: "Create and revoke API keys for external integrations.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.VIEW_APPLICATIONS]: {
    name: "Application History",
    description: "View your complete job application history and status.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.EMERGENCY_STOP]: {
    name: "Emergency Stop",
    description: "Immediately pause all active automation processes.",
    requiredPlan: "PRO"
  },

  // ── Developer permissions ────────────────────────────────────────────────
  [PERMISSIONS.VIEW_USERS]: {
    name: "View Users",
    description: "Browse registered users in the admin panel.",
    requiredPlan: "DEVELOPER"
  },
  [PERMISSIONS.VIEW_ANALYTICS]: {
    name: "View Analytics",
    description: "Access platform analytics and usage statistics.",
    requiredPlan: "DEVELOPER"
  },
  [PERMISSIONS.ACCESS_ADMIN_PANEL]: {
    name: "Admin Panel Access",
    description: "Access the administrative control panel.",
    requiredPlan: "DEVELOPER"
  },
  [PERMISSIONS.VIEW_ALL_SUBSCRIPTIONS]: {
    name: "View All Subscriptions",
    description: "View subscription details for all users.",
    requiredPlan: "DEVELOPER"
  },

  // ── Admin permissions ────────────────────────────────────────────────────
  [PERMISSIONS.MANAGE_USERS]: {
    name: "Manage Users",
    description: "Ban, suspend, or manage user accounts.",
    requiredPlan: "ADMIN"
  },
  [PERMISSIONS.CHANGE_USER_ROLE]: {
    name: "Change User Roles",
    description: "Promote or demote user roles and permissions.",
    requiredPlan: "ADMIN"
  },
  [PERMISSIONS.MANAGE_CREDITS]: {
    name: "Manage Credits",
    description: "Manually add, reset, or adjust user credit balances.",
    requiredPlan: "ADMIN"
  },
  [PERMISSIONS.UNLIMITED_CREDITS]: {
    name: "Unlimited Credits",
    description: "Bypass all credit limits and usage restrictions.",
    requiredPlan: "ADMIN"
  },
  [PERMISSIONS.DELETE_USER]: {
    name: "Delete Users",
    description: "Permanently delete user accounts from the system.",
    requiredPlan: "ADMIN"
  },
  [PERMISSIONS.MANAGE_ROLES]: {
    name: "Manage Roles",
    description: "Create, edit, and delete user roles and their permission assignments from the admin dashboard.",
    requiredPlan: "DEVELOPER"
  },
};

export const PLANS = {
  FREE: {
    name: 'Free',
    credits: 2,
    interval: 'day',
    price: 0,
  },
  PRO: {
    name: 'Pro',
    credits: 200,
    interval: 'month',
    price: 13.99, // in dollars
    currency: 'usd',
  },
};

export const TOKEN_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',
  ACCESS_TOKEN_EXPIRY_SECONDS: 15 * 60, // Must match ACCESS_TOKEN_EXPIRY
  REFRESH_TOKEN_EXPIRY_DAYS: 15,
  REFRESH_TOKEN_EXPIRY_MS: 15 * 24 * 60 * 60 * 1000,
  TYPE_ACCESS: 'access',
  TYPE_REFRESH: 'refresh',
};

export const DEFAULTS = {
  CREDITS_ON_SIGNUP: 2,
};

export const OTP_CONFIG = {
  EXPIRY_MS: 5 * 60 * 1000, // 5 minutes — change here to update everywhere
};

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  ONBOARDING: '/onboarding',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  PRICING: '/pricing',
  CHECKOUT: '/checkout',
  RESUME_HISTORY: '/resume-history',
  AI_EDIT: '/ai-edit',
  COVER_LETTERS: '/cover-letters',
  COVER_LETTER: (id) => `/cover-letters/${id}`,
  ADMIN: '/admin',
  AUTOMATION: '/automation',
  AUTOMATION_JOBS: '/automation/jobs',
  AUTOMATION_APPLICATIONS: '/automation/applications',
  AUTOMATION_SETTINGS: '/automation/settings',
  API_KEYS: '/api-keys',
};

// ---------------------------------------------------------------------------
// API Endpoints
// ---------------------------------------------------------------------------

export const API_ENDPOINTS = {
  AUTH: {
    OTP: '/api/auth/otp',
    VERIFY_OTP: '/api/auth/verify-otp',
    LOGOUT: '/api/auth/logout',
    VERIFY_TOKEN: '/api/auth/verify-token',
    CHECK_SUBSCRIPTION: '/api/auth/check-subscription',
  },
  USER: {
    PROFILE: '/api/user/profile',
  },
  RESUMES: {
    LIST: '/api/resumes',
    BY_ID: (id) => `/api/resumes/${id}`,
  },
  GENERATE: '/api/generate-content',
  GENERATE_COVER_LETTER: '/api/generate-cover-letter',
  COVER_LETTERS: {
    LIST: '/api/cover-letters',
    BY_ID: (id) => `/api/cover-letters/${id}`,
  },
  EDIT_WITH_AI: '/api/edit-resume-with-ai',
  PARSE_RESUME: '/api/parse-resume',
  CHECKOUT: {
    CREATE_SESSION: '/api/checkout/create-session',
    CREATE_PORTAL: '/api/checkout/create-portal-session',
    VERIFY_SESSION: '/api/checkout/verify-session',
  },
  ADMIN: {
    USERS: '/api/admin/users',
    USER_ROLE: (id) => `/api/admin/users/${id}/role`,
    USER_RESET_USAGE: (id) => `/api/admin/users/${id}/reset-usage`,
  },
  AUTOMATION: {
    GATEKEEPER: '/api/gatekeeper/evaluate',
    TEMPLATES: '/api/resume/templates',
    HEALTH: '/api/health',
    API_KEYS: '/api/api-keys',
    API_KEY_BY_ID: (id) => `/api/api-keys/${id}`,
  },
};
