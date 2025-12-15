'use server';

import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser } from '@/lib/serverAuth';
import { UserService } from '@/services/userService';
import { ResumeService } from '@/services/resumeService';
import { logger } from '@/lib/logger';
import { checkPermission } from '@/lib/accessControl';
import { PERMISSIONS, ROLES } from '@/lib/constants';

/**
 * Update user profile data.
 * @param {FormData} formData - Form data with profile fields
 * @returns {Promise<{success: boolean, error?: string, user?: object}>}
 */
export async function updateProfile(formData) {
  try {
    const { userId, role } = await getAuthenticatedUser();
    
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!checkPermission({ role }, PERMISSIONS.EDIT_OWN_PROFILE)) {
      logger.info('Permission denied: EDIT_OWN_PROFILE', { userId, role });
      return { success: false, error: 'Permission denied' };
    }

    const email = formData.get('email');
    const name = formData.get('name');

    const updateData = {};
    if (email) updateData.email = email;
    if (name) updateData.name = name;

    const user = await UserService.updateUser(userId, updateData);

    // Revalidate the profile page to show updated data
    revalidatePath('/profile');
    revalidatePath('/dashboard');

    logger.info('Profile updated via server action', { userId });
    
    return { success: true, user };
  } catch (error) {
    logger.error('Error in updateProfile server action', error);
    return { success: false, error: error.message || 'Failed to update profile' };
  }
}

/**
 * Upload and set main resume from parsed data.
 * @param {object} resumeData - Parsed resume data
 * @returns {Promise<{success: boolean, error?: string, resume?: object}>}
 */
export async function uploadMainResume(resumeData) {
  try {
    const { userId, role } = await getAuthenticatedUser();
    
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!checkPermission({ role }, PERMISSIONS.UPLOAD_MAIN_RESUME)) {
      logger.info('Permission denied: UPLOAD_MAIN_RESUME', { userId, role });
      return { success: false, error: 'Permission denied' };
    }

    const user = await UserService.getUserById(userId);

    // If user already has a main resume, update it
    if (user.mainResume) {
      const updatedResume = await ResumeService.updateResumeContent(
        user.mainResume,
        resumeData
      );
      
      revalidatePath('/profile');
      revalidatePath('/dashboard');
      
      logger.info('Main resume updated via server action', { userId, resumeId: user.mainResume });
      return { success: true, resume: updatedResume };
    } else {
      // Create new main resume
      const newResume = await ResumeService.createResume(userId, resumeData, { resumeName: 'Master Resume' });
      await UserService.setMainResume(userId, newResume._id);
      
      revalidatePath('/profile');
      revalidatePath('/dashboard');
      
      logger.info('Main resume created via server action', { userId, resumeId: newResume._id });
      return { success: true, resume: newResume };
    }
  } catch (error) {
    logger.error('Error in uploadMainResume server action', error);
    return { success: false, error: error.message || 'Failed to upload resume' };
  }
}

/**
 * Get user profile data.
 * @returns {Promise<{success: boolean, error?: string, user?: object}>}
 */
export async function getProfile() {
  try {
    const { userId, role } = await getAuthenticatedUser();
    
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!checkPermission({ role }, PERMISSIONS.VIEW_OWN_PROFILE)) {
      logger.info('Permission denied: VIEW_OWN_PROFILE', { userId, role });
      return { success: false, error: 'Permission denied' };
    }

    const user = await UserService.getUserWithMainResume(userId);
    
    return { success: true, user };
  } catch (error) {
    logger.error('Error in getProfile server action', error);
    return { success: false, error: error.message || 'Failed to get profile' };
  }
}

/**
 * Check subscription status for the authenticated user.
 * @returns {Promise<{success: boolean, error?: string, subscription?: object}>}
 */
export async function checkSubscriptionStatus() {
  try {
    const { userId, role } = await getAuthenticatedUser();
    
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!checkPermission({ role }, PERMISSIONS.VIEW_OWN_SUBSCRIPTION)) {
      logger.info('Permission denied: VIEW_OWN_SUBSCRIPTION', { userId, role });
      return { success: false, error: 'Permission denied' };
    }

    const user = await UserService.getUserById(userId, {
      select: 'role subscriptionId subscriptionStatus subscriptionEndDate',
      lean: true,
    });

    const subscription = {
      isActive: user.role === ROLES.SUBSCRIBER, // SUBSCRIBER role
      subscriptionId: user.subscriptionId,
      status: user.subscriptionStatus,
      endDate: user.subscriptionEndDate,
      isPro: user.role <= ROLES.SUBSCRIBER, // SUBSCRIBER or higher
    };

    logger.debug('Subscription status checked', { userId, isActive: subscription.isActive });

    return { success: true, subscription };
  } catch (error) {
    logger.error('Error in checkSubscriptionStatus server action', error);
    return { success: false, error: error.message || 'Failed to check subscription' };
  }
}
