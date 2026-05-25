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

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    // Admin has ALL permissions
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.CHANGE_USER_ROLE,
    PERMISSIONS.VIEW_ALL_SUBSCRIPTIONS,
    PERMISSIONS.MANAGE_CREDITS,
    PERMISSIONS.UNLIMITED_CREDITS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.ACCESS_ADMIN_PANEL,
    PERMISSIONS.DELETE_USER,
    // AI & Generation
    PERMISSIONS.GENERATE_RESUME,
    PERMISSIONS.EDIT_RESUME_WITH_AI,
    PERMISSIONS.CREATE_NEW_RESUME_ON_EDIT,
    PERMISSIONS.USE_SPECIAL_INSTRUCTIONS,
    PERMISSIONS.PARSE_RESUME,
    // Resume Management
    PERMISSIONS.CREATE_RESUME,
    PERMISSIONS.VIEW_OWN_RESUMES,
    PERMISSIONS.DELETE_OWN_RESUME,
    PERMISSIONS.EDIT_RESUME_METADATA,
    PERMISSIONS.DOWNLOAD_PDF,
    // Profile
    PERMISSIONS.VIEW_OWN_PROFILE,
    PERMISSIONS.EDIT_OWN_PROFILE,
    PERMISSIONS.UPLOAD_MAIN_RESUME,
    PERMISSIONS.ACCESS_AI_EDIT_PAGE,
    // Subscription
    PERMISSIONS.VIEW_OWN_SUBSCRIPTION,
    PERMISSIONS.MANAGE_OWN_SUBSCRIPTION,
    // Automation
    PERMISSIONS.VIEW_AUTOMATION,
    PERMISSIONS.MANAGE_SCHEDULER,
    PERMISSIONS.MANAGE_PLATFORM_SESSIONS,
    PERMISSIONS.MANAGE_CRITERIA,
    PERMISSIONS.MANAGE_GATEKEEPER_RULES,
    PERMISSIONS.MANAGE_API_KEYS,
    PERMISSIONS.VIEW_APPLICATIONS,
    PERMISSIONS.EMERGENCY_STOP,
  ],
  [ROLES.DEVELOPER]: [
    // Developer: Admin panel access + basic user features
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.ACCESS_ADMIN_PANEL,
    PERMISSIONS.VIEW_ALL_SUBSCRIPTIONS,
    // Basic user features
    PERMISSIONS.GENERATE_RESUME,
    PERMISSIONS.EDIT_RESUME_WITH_AI,
    PERMISSIONS.CREATE_NEW_RESUME_ON_EDIT,
    PERMISSIONS.USE_SPECIAL_INSTRUCTIONS,
    PERMISSIONS.PARSE_RESUME,
    PERMISSIONS.CREATE_RESUME,
    PERMISSIONS.VIEW_OWN_RESUMES,
    PERMISSIONS.DELETE_OWN_RESUME,
    PERMISSIONS.EDIT_RESUME_METADATA,
    PERMISSIONS.DOWNLOAD_PDF,
    PERMISSIONS.VIEW_OWN_PROFILE,
    PERMISSIONS.EDIT_OWN_PROFILE,
    PERMISSIONS.UPLOAD_MAIN_RESUME,
    PERMISSIONS.ACCESS_AI_EDIT_PAGE,
    PERMISSIONS.VIEW_OWN_SUBSCRIPTION,
    // Automation
    PERMISSIONS.VIEW_AUTOMATION,
    PERMISSIONS.MANAGE_SCHEDULER,
    PERMISSIONS.MANAGE_PLATFORM_SESSIONS,
    PERMISSIONS.MANAGE_CRITERIA,
    PERMISSIONS.MANAGE_GATEKEEPER_RULES,
    PERMISSIONS.MANAGE_API_KEYS,
    PERMISSIONS.VIEW_APPLICATIONS,
    PERMISSIONS.EMERGENCY_STOP,
  ],
  [ROLES.SUBSCRIBER]: [
    // Subscriber (Pro): Full AI features + resume management
    PERMISSIONS.GENERATE_RESUME,
    PERMISSIONS.EDIT_RESUME_WITH_AI,
    PERMISSIONS.CREATE_NEW_RESUME_ON_EDIT,
    PERMISSIONS.USE_SPECIAL_INSTRUCTIONS,
    PERMISSIONS.PARSE_RESUME,
    PERMISSIONS.CREATE_RESUME,
    PERMISSIONS.VIEW_OWN_RESUMES,
    PERMISSIONS.DELETE_OWN_RESUME,
    PERMISSIONS.EDIT_RESUME_METADATA,
    PERMISSIONS.DOWNLOAD_PDF,
    PERMISSIONS.VIEW_OWN_PROFILE,
    PERMISSIONS.EDIT_OWN_PROFILE,
    PERMISSIONS.UPLOAD_MAIN_RESUME,
    PERMISSIONS.ACCESS_AI_EDIT_PAGE,
    PERMISSIONS.VIEW_OWN_SUBSCRIPTION,
    PERMISSIONS.MANAGE_OWN_SUBSCRIPTION,
    // Automation
    PERMISSIONS.VIEW_AUTOMATION,
    PERMISSIONS.MANAGE_SCHEDULER,
    PERMISSIONS.MANAGE_PLATFORM_SESSIONS,
    PERMISSIONS.MANAGE_CRITERIA,
    PERMISSIONS.MANAGE_GATEKEEPER_RULES,
    PERMISSIONS.MANAGE_API_KEYS,
    PERMISSIONS.VIEW_APPLICATIONS,
    PERMISSIONS.EMERGENCY_STOP,
  ],
  [ROLES.USER]: [
    // Free User: Basic features only, limited AI usage
    // PERMISSIONS.PARSE_RESUME, // Parse resume is Pro only
    // PERMISSIONS.VIEW_OWN_RESUMES, // Viewing generated resumes list is Pro only
    PERMISSIONS.VIEW_OWN_PROFILE,
    PERMISSIONS.EDIT_OWN_PROFILE,
    PERMISSIONS.UPLOAD_MAIN_RESUME,   // Can save/update their master resume manually
    PERMISSIONS.CREATE_RESUME,        // Can create a resume via manual form
    PERMISSIONS.VIEW_OWN_SUBSCRIPTION,
    PERMISSIONS.DELETE_OWN_RESUME,
    PERMISSIONS.MANAGE_OWN_SUBSCRIPTION, // Can upgrade
    PERMISSIONS.DOWNLOAD_PDF, // Can download their master resume
    // Note: NO AI features
  ],
};

export const PERMISSION_METADATA = {
  [PERMISSIONS.PARSE_RESUME]: {
    name: "AI Resume Parsing",
    description: "Upload your existing resume and let our AI extract your details instantly. Save time and get a head start.",
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
  [PERMISSIONS.GENERATE_RESUME]: {
    name: "AI Resume Generation",
    description: "Generate tailored resumes from job descriptions using advanced AI.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.EDIT_OWN_PROFILE]: {
    name: "Edit Profile",
    description: "Update your personal details and information.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.VIEW_OWN_RESUMES]: {
    name: "View Saved Resumes",
    description: "Access your library of generated and saved resumes.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.DELETE_OWN_RESUME]: {
    name: "Delete Resumes",
    description: "Remove resumes from your library.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.DOWNLOAD_PDF]: {
    name: "PDF Download",
    description: "Download your resumes as professionally formatted PDF files.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.EDIT_RESUME_METADATA]: {
    name: "Edit Resume Details",
    description: "Update job title and company name for your saved resumes.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.VIEW_OWN_PROFILE]: {
    name: "View Profile",
    description: "Access your profile information.",
    requiredPlan: "PRO"
  },
  [PERMISSIONS.VIEW_OWN_SUBSCRIPTION]: {
    name: "View Subscription",
    description: "Check your subscription status and plan details.",
    requiredPlan: "PRO"
  }
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
