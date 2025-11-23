'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { verifyAuth } from '@/lib/auth';
import { UserService } from '@/services/userService';
import { SubscriptionService } from '@/services/subscriptionService';
import { hasPermission } from '@/lib/accessControl';
import { PERMISSIONS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import User from '@/models/User';
import Transaction from '@/models/Transaction';

/**
 * Get the authenticated user with role.
 * @returns {Promise<{userId: string|null, role: number|null}>}
 */
async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const refreshToken = cookieStore.get('refreshToken')?.value;

  try {
    const authResult = await verifyAuth(
      { accessToken, refreshToken },
      { ip: 'server-action', userAgent: 'server-action' }
    );

    if (!authResult.ok) {
      return { userId: null, role: null };
    }

    return { userId: authResult.userId, role: authResult.role };
  } catch (error) {
    logger.error('Authentication failed in admin action', error);
    return { userId: null, role: null };
  }
}

/**
 * Get all users with pagination and filters.
 * @param {object} options - {page?, limit?, search?, role?}
 * @returns {Promise<{success: boolean, error?: string, users?: Array, total?: number}>}
 */
export async function getAllUsers(options = {}) {
  try {
    const { userId, role } = await getAuthenticatedUser();
    
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check admin permission
    if (!hasPermission(role, PERMISSIONS.VIEW_USERS)) {
      logger.info('Permission denied: VIEW_USERS', { userId, role });
      return { success: false, error: 'Permission denied' };
    }

    const {
      page = 1,
      limit = 50,
      search = '',
      roleFilter = null,
    } = options;

    const query = {};
    
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    if (roleFilter !== null) {
      query.role = roleFilter;
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('email name role creditsUsed lastCreditResetDate subscriptionId createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    logger.info('Admin fetched users', { userId, count: users.length });

    return {
      success: true,
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    logger.error('Error in getAllUsers admin action', error);
    return { success: false, error: error.message || 'Failed to get users' };
  }
}

/**
 * Get a specific user's details.
 * @param {string} targetUserId - The user ID to get
 * @returns {Promise<{success: boolean, error?: string, user?: object}>}
 */
export async function getUserDetails(targetUserId) {
  try {
    const { userId, role } = await getAuthenticatedUser();
    
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!hasPermission(role, PERMISSIONS.VIEW_USERS)) {
      logger.info('Permission denied: VIEW_USERS', { userId, role });
      return { success: false, error: 'Permission denied' };
    }

    const user = await UserService.getUserById(targetUserId, {
      populate: true,
      populateFields: ['mainResume', 'generatedResumes'],
    });

    return { success: true, user };
  } catch (error) {
    logger.error('Error in getUserDetails admin action', error);
    return { success: false, error: error.message || 'Failed to get user details' };
  }
}

/**
 * Update a user's credits.
 * @param {string} targetUserId - The user ID to update
 * @param {number} credits - New credits value
 * @returns {Promise<{success: boolean, error?: string, user?: object}>}
 */
export async function updateUserCredits(targetUserId, credits) {
  try {
    const { userId, role } = await getAuthenticatedUser();
    
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!hasPermission(role, PERMISSIONS.MANAGE_CREDITS)) {
      logger.info('Permission denied: MANAGE_CREDITS', { userId, role });
      return { success: false, error: 'Permission denied' };
    }

    const user = await UserService.setUserCredits(targetUserId, credits);

    // Revalidate admin pages
    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/users');

    logger.info('Admin updated user credits', { adminId: userId, targetUserId, credits });

    return { success: true, user };
  } catch (error) {
    logger.error('Error in updateUserCredits admin action', error);
    return { success: false, error: error.message || 'Failed to update credits' };
  }
}

/**
 * Reset a user's usage/credits.
 * @param {string} targetUserId - The user ID to reset
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function resetUserUsage(targetUserId) {
  try {
    const { userId, role } = await getAuthenticatedUser();
    
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!hasPermission(role, PERMISSIONS.MANAGE_CREDITS)) {
      logger.info('Permission denied: MANAGE_CREDITS', { userId, role });
      return { success: false, error: 'Permission denied' };
    }

    await SubscriptionService.resetUsage(targetUserId);

    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/users');

    logger.info('Admin reset user usage', { adminId: userId, targetUserId });

    return { success: true };
  } catch (error) {
    logger.error('Error in resetUserUsage admin action', error);
    return { success: false, error: error.message || 'Failed to reset usage' };
  }
}

/**
 * Change a user's role.
 * @param {string} targetUserId - The user ID to update
 * @param {number} newRole - New role value
 * @returns {Promise<{success: boolean, error?: string, user?: object}>}
 */
export async function changeUserRole(targetUserId, newRole) {
  try {
    const { userId, role } = await getAuthenticatedUser();
    
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!hasPermission(role, PERMISSIONS.CHANGE_USER_ROLE)) {
      logger.info('Permission denied: CHANGE_USER_ROLE', { userId, role });
      return { success: false, error: 'Permission denied' };
    }

    const user = await UserService.updateUserRole(targetUserId, newRole);

    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/users');

    logger.info('Admin changed user role', { adminId: userId, targetUserId, newRole });

    return { success: true, user };
  } catch (error) {
    logger.error('Error in changeUserRole admin action', error);
    return { success: false, error: error.message || 'Failed to change role' };
  }
}

/**
 * Ban/unban a user.
 * @param {string} targetUserId - The user ID to ban
 * @param {boolean} isBanned - True to ban, false to unban
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function toggleUserBan(targetUserId, isBanned) {
  try {
    const { userId, role } = await getAuthenticatedUser();
    
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!hasPermission(role, PERMISSIONS.MANAGE_USERS)) {
      logger.info('Permission denied: MANAGE_USERS', { userId, role });
      return { success: false, error: 'Permission denied' };
    }

    await UserService.updateUser(targetUserId, { isBanned });

    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/users');

    logger.info('Admin toggled user ban', { adminId: userId, targetUserId, isBanned });

    return { success: true };
  } catch (error) {
    logger.error('Error in toggleUserBan admin action', error);
    return { success: false, error: error.message || 'Failed to toggle ban' };
  }
}

/**
 * Delete a user (permanent).
 * @param {string} targetUserId - The user ID to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteUser(targetUserId) {
  try {
    const { userId, role } = await getAuthenticatedUser();
    
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!hasPermission(role, PERMISSIONS.MANAGE_USERS)) {
      logger.info('Permission denied: MANAGE_USERS', { userId, role });
      return { success: false, error: 'Permission denied' };
    }

    // Don't allow deleting yourself
    if (userId === targetUserId) {
      return { success: false, error: 'Cannot delete your own account' };
    }

    // Delete user and all their data
    await User.findByIdAndDelete(targetUserId);

    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/users');

    logger.info('Admin deleted user', { adminId: userId, targetUserId });

    return { success: true };
  } catch (error) {
    logger.error('Error in deleteUser admin action', error);
    return { success: false, error: error.message || 'Failed to delete user' };
  }
}

/**
 * Get admin analytics/statistics.
 * @returns {Promise<{success: boolean, error?: string, analytics?: object}>}
 */
export async function getAdminAnalytics() {
  try {
    const { userId, role } = await getAuthenticatedUser();
    
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!hasPermission(role, PERMISSIONS.VIEW_ANALYTICS)) {
      logger.info('Permission denied: VIEW_ANALYTICS', { userId, role });
      return { success: false, error: 'Permission denied' };
    }

    const [
      totalUsers,
      activeSubscribers,
      totalTransactions,
      recentTransactions,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 99 }), // SUBSCRIBER role
      Transaction.countDocuments(),
      Transaction.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'email name')
        .lean(),
    ]);

    const analytics = {
      totalUsers,
      activeSubscribers,
      totalTransactions,
      recentTransactions,
      timestamp: new Date(),
    };

    logger.info('Admin fetched analytics', { userId });

    return { success: true, analytics };
  } catch (error) {
    logger.error('Error in getAdminAnalytics admin action', error);
    return { success: false, error: error.message || 'Failed to get analytics' };
  }
}

/**
 * Get all transactions with pagination.
 * @param {object} options - {page?, limit?}
 * @returns {Promise<{success: boolean, error?: string, transactions?: Array}>}
 */
export async function getTransactions(options = {}) {
  try {
    const { userId, role } = await getAuthenticatedUser();
    
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!hasPermission(role, PERMISSIONS.VIEW_ALL_SUBSCRIPTIONS)) {
      logger.info('Permission denied: VIEW_ALL_SUBSCRIPTIONS', { userId, role });
      return { success: false, error: 'Permission denied' };
    }

    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'email name')
        .lean(),
      Transaction.countDocuments(),
    ]);

    return {
      success: true,
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    logger.error('Error in getTransactions admin action', error);
    return { success: false, error: error.message || 'Failed to get transactions' };
  }
}
