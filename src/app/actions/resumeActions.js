'use server';

import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser } from '@/lib/serverAuth';
import { UserService } from '@/services/userService';
import { ResumeService } from '@/services/resumeService';
import { checkPermission } from '@/lib/accessControl';
import { PERMISSIONS } from '@/lib/constants';
import { logger } from '@/lib/logger';

/**
 * Update resume metadata (job title, company name).
 * @param {string} metadataId - The metadata ID to update
 * @param {object} data - {jobTitle?, companyName?}
 * @returns {Promise<{success: boolean, error?: string, metadata?: object}>}
 */
export async function updateResumeMetadata(metadataId, data) {
  try {
    const { userId, role } = await getAuthenticatedUser();
    
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check permission
    if (!checkPermission({ role }, PERMISSIONS.EDIT_RESUME_METADATA)) {
      logger.info('Permission denied: EDIT_RESUME_METADATA', { userId, role });
      return { success: false, error: 'Permission denied' };
    }

    const metadata = await ResumeService.updateResumeMetadata(metadataId, data);

    // Revalidate pages that show resumes
    revalidatePath('/dashboard');
    revalidatePath('/resume-history');

    logger.info('Resume metadata updated via server action', { userId, metadataId });
    
    return { success: true, metadata };
  } catch (error) {
    logger.error('Error in updateResumeMetadata server action', error);
    return { success: false, error: error.message || 'Failed to update metadata' };
  }
}

/**
 * Delete a resume.
 * @param {string} resumeId - The resume ID to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteResume(resumeId) {
  try {
    const { userId, role } = await getAuthenticatedUser();
    
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check permission
    if (!checkPermission({ role }, PERMISSIONS.DELETE_OWN_RESUME)) {
      logger.info('Permission denied: DELETE_OWN_RESUME', { userId, role });
      return { success: false, error: 'Permission denied' };
    }

    // Delete the resume and its metadata
    await ResumeService.deleteResume(resumeId, { deleteMetadata: true });

    // Remove from user's generatedResumes array
    await UserService.removeGeneratedResume(userId, resumeId);

    // Revalidate pages
    revalidatePath('/dashboard');
    revalidatePath('/resume-history');

    logger.info('Resume deleted via server action', { userId, resumeId });
    
    return { success: true };
  } catch (error) {
    logger.error('Error in deleteResume server action', error);
    return { success: false, error: error.message || 'Failed to delete resume' };
  }
}

/**
 * Get all resumes for the authenticated user.
 * @returns {Promise<{success: boolean, error?: string, resumes?: Array}>}
 */
export async function getUserResumes() {
  try {
    const { userId, role } = await getAuthenticatedUser();
    
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check permission
    if (!checkPermission({ role }, PERMISSIONS.VIEW_OWN_RESUMES)) {
      logger.info('Permission denied: VIEW_OWN_RESUMES', { userId, role });
      return { success: false, error: 'Permission denied' };
    }

    const resumes = await ResumeService.getResumesByUserId(userId, {
      populate: true,
      sort: { createdAt: -1 },
    });

    return { success: true, resumes };
  } catch (error) {
    logger.error('Error in getUserResumes server action', error);
    return { success: false, error: error.message || 'Failed to get resumes' };
  }
}

/**
 * Set a resume as the main resume.
 * @param {string} resumeId - The resume ID to set as main
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function setAsMainResume(resumeId) {
  try {
    const { userId, role } = await getAuthenticatedUser();
    
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const user = await UserService.getUserById(userId);

    // Archive current main resume if exists
    if (user.mainResume && user.mainResume.toString() !== resumeId) {
      if (!user.generatedResumes.includes(user.mainResume)) {
        await UserService.addGeneratedResume(userId, user.mainResume);
      }
    }

    // Set new main resume
    await UserService.setMainResume(userId, resumeId);

    // Remove from generated list if it's there
    await UserService.removeGeneratedResume(userId, resumeId);

    // Revalidate pages
    revalidatePath('/dashboard');
    revalidatePath('/profile');
    revalidatePath('/resume-history');

    logger.info('Main resume updated via server action', { userId, resumeId });
    
    return { success: true };
  } catch (error) {
    logger.error('Error in setAsMainResume server action', error);
    return { success: false, error: error.message || 'Failed to set main resume' };
  }
}
