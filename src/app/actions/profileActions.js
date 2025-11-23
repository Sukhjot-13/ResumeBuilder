'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { verifyAuth } from '@/lib/auth';
import { UserService } from '@/services/userService';
import { ResumeService } from '@/services/resumeService';
import { logger } from '@/lib/logger';

/**
 * Get the authenticated user ID from cookies.
 * @returns {Promise<string|null>} User ID or null if not authenticated
 */
async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const refreshToken = cookieStore.get('refreshToken')?.value;

  try {
    const authResult = await verifyAuth(
      { accessToken, refreshToken },
      { ip: 'server-action', userAgent: 'server-action' }
    );

    if (!authResult.ok) {
      return null;
    }

    return authResult.userId;
  } catch (error) {
    logger.error('Authentication failed in server action', error);
    return null;
  }
}

/**
 * Update user profile data.
 * @param {FormData} formData - Form data with profile fields
 * @returns {Promise<{success: boolean, error?: string, user?: object}>}
 */
export async function updateProfile(formData) {
  try {
    const userId = await getAuthenticatedUserId();
    
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
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
    const userId = await getAuthenticatedUserId();
    
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
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
      const newResume = await ResumeService.createResume(userId, resumeData);
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
    const userId = await getAuthenticatedUserId();
    
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
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
    const userId = await getAuthenticatedUserId();
    
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const user = await UserService.getUserById(userId, {
      select: 'role subscriptionId subscriptionStatus subscriptionEndDate',
      lean: true,
    });

    const subscription = {
      isActive: user.role === 99, // SUBSCRIBER role
      subscriptionId: user.subscriptionId,
      status: user.subscriptionStatus,
      endDate: user.subscriptionEndDate,
      isPro: user.role <= 99, // SUBSCRIBER or higher
    };

    logger.debug('Subscription status checked', { userId, isActive: subscription.isActive });

    return { success: true, subscription };
  } catch (error) {
    logger.error('Error in checkSubscriptionStatus server action', error);
    return { success: false, error: error.message || 'Failed to check subscription' };
  }
}
