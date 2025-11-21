export const ROLES = {
  ADMIN: 0,
  DEVELOPER: 70,
  SUBSCRIBER: 99,
  USER: 100,
};

export const PERMISSIONS = {
  // User Management
  VIEW_USERS: 'view_users',
  MANAGE_USERS: 'manage_users', // Ban, delete, etc.
  CHANGE_USER_ROLE: 'change_user_role',
  
  // Credits & Subscription
  VIEW_ALL_SUBSCRIPTIONS: 'view_all_subscriptions',
  MANAGE_CREDITS: 'manage_credits', // Reset, add credits
  UNLIMITED_CREDITS: 'unlimited_credits', // Bypass limits
  
  // System
  VIEW_ANALYTICS: 'view_analytics',
  ACCESS_ADMIN_PANEL: 'access_admin_panel',
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.CHANGE_USER_ROLE,
    PERMISSIONS.VIEW_ALL_SUBSCRIPTIONS,
    PERMISSIONS.MANAGE_CREDITS,
    PERMISSIONS.UNLIMITED_CREDITS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.ACCESS_ADMIN_PANEL,
  ],
  [ROLES.DEVELOPER]: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.ACCESS_ADMIN_PANEL,
  ],
  [ROLES.SUBSCRIBER]: [],
  [ROLES.USER]: [],
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
    credits: 150,
    interval: 'month',
    price: 13.99, // in cents
    currency: 'usd',
  },
};
