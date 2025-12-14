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
  
  // ==========================================
  // Subscription & Billing
  // ==========================================
  VIEW_OWN_SUBSCRIPTION: 'view_own_subscription',
  MANAGE_OWN_SUBSCRIPTION: 'manage_own_subscription', // Upgrade, cancel subscription
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
    // Subscription
    PERMISSIONS.VIEW_OWN_SUBSCRIPTION,
    PERMISSIONS.MANAGE_OWN_SUBSCRIPTION,
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
    PERMISSIONS.VIEW_OWN_SUBSCRIPTION,
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
    PERMISSIONS.VIEW_OWN_SUBSCRIPTION,
    PERMISSIONS.MANAGE_OWN_SUBSCRIPTION,
  ],
  [ROLES.USER]: [
    // Free User: Basic features only, limited AI usage
    // PERMISSIONS.PARSE_RESUME, // Can upload and parse resume
    // PERMISSIONS.VIEW_OWN_RESUMES,
    PERMISSIONS.VIEW_OWN_PROFILE,
    // PERMISSIONS.EDIT_RESUME_WITH_AI,
    PERMISSIONS.EDIT_OWN_PROFILE,
    PERMISSIONS.UPLOAD_MAIN_RESUME,
    PERMISSIONS.VIEW_OWN_SUBSCRIPTION,
    PERMISSIONS.DELETE_OWN_RESUME,
    PERMISSIONS.MANAGE_OWN_SUBSCRIPTION, // Can upgrade
    PERMISSIONS.DOWNLOAD_PDF, // Can download their uploaded resume
    // Note: NO AI features, limited by credits even if they try
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
  REFRESH_TOKEN_EXPIRY_DAYS: 15,
  REFRESH_TOKEN_EXPIRY_MS: 15 * 24 * 60 * 60 * 1000,
  TYPE_ACCESS: 'access',
  TYPE_REFRESH: 'refresh',
};

export const DEFAULTS = {
  CREDITS_ON_SIGNUP: 2,
};
