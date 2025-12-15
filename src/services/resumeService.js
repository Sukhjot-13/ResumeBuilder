import Resume from '@/models/resume';
import ResumeMetadata from '@/models/resumeMetadata';
import dbConnect from '@/lib/mongodb';
import { logger } from '@/lib/logger';

/**
 * Resume Service
 * 
 * Centralized service for all resume-related database operations.
 * Each function has a single responsibility and uses parameters for flexibility.
 */

export const ResumeService = {
  /**
   * Get a resume by ID.
   * @param {string} resumeId - The resume ID
   * @param {object} options - Query options
   * @param {boolean} options.populate - Whether to populate references (default: false)
   * @param {string|string[]} options.populateFields - Fields to populate (default: 'metadata')
   * @param {string} options.select - Fields to select (default: all fields)
   * @param {boolean} options.lean - Return plain JS object (default: false)
   * @param {boolean} options.throwOnNotFound - Throw error if not found (default: true)
   * @returns {Promise<object|null>} Resume object or null
   */
  async getResumeById(resumeId, options = {}) {
    const {
      populate = false,
      populateFields = 'metadata',
      select = '',
      lean = false,
      throwOnNotFound = true,
    } = options;

    await dbConnect();

    try {
      let query = Resume.findById(resumeId);

      if (populate) {
        if (Array.isArray(populateFields)) {
          populateFields.forEach(field => {
            query = query.populate(field);
          });
        } else {
          query = query.populate(populateFields);
        }
      }

      if (select) {
        query = query.select(select);
      }

      if (lean) {
        query = query.lean();
      }

      const resume = await query;

      if (!resume && throwOnNotFound) {
        logger.warn('Resume not found', { resumeId });
        throw new Error('Resume not found');
      }

      return resume;
    } catch (error) {
      logger.error('Error fetching resume by ID', error, { resumeId });
      throw error;
    }
  },

  /**
   * Get a resume with metadata populated.
   * Convenience wrapper around getResumeById.
   * @param {string} resumeId - The resume ID
   * @param {boolean} throwOnNotFound - Throw error if not found (default: true)
   * @returns {Promise<object|null>} Resume object with metadata
   */
  async getResumeWithMetadata(resumeId, throwOnNotFound = true) {
    return this.getResumeById(resumeId, {
      populate: true,
      populateFields: 'metadata',
      throwOnNotFound,
    });
  },

  /**
   * Get all resumes for a specific user.
   * @param {string} userId - The user ID
   * @param {object} options - Query options
   * @param {boolean} options.populate - Whether to populate metadata (default: true)
   * @param {number} options.limit - Max number of resumes to return (default: no limit)
   * @param {object} options.sort - Sort order (default: { createdAt: -1 })
   * @param {boolean} options.lean - Return plain JS objects (default: false)
   * @returns {Promise<Array>} Array of resume objects
   */
  async getResumesByUserId(userId, options = {}) {
    const {
      populate = true,
      limit = 0,
      sort = { createdAt: -1 },
      lean = false,
    } = options;

    await dbConnect();

    try {
      let query = Resume.find({ userId });

      if (populate) {
        query = query.populate('metadata');
      }

      if (sort) {
        query = query.sort(sort);
      }

      if (limit > 0) {
        query = query.limit(limit);
      }

      if (lean) {
        query = query.lean();
      }

      const resumes = await query;
      logger.debug('Fetched resumes for user', { userId, count: resumes.length });
      return resumes;
    } catch (error) {
      logger.error('Error fetching resumes by user ID', error, { userId });
      throw error;
    }
  },

  /**
   * Create a new resume.
   * @param {string} userId - The user ID
   * @param {object} content - The resume content
   * @param {object} metadata - Optional metadata {jobTitle, companyName}
   * @param {object} options - Creation options
   * @param {boolean} options.returnPopulated - Return with metadata populated (default: true)
   * @returns {Promise<object>} Created resume object
   */
  async createResume(userId, content, metadata = null, options = {}) {
    const {
      returnPopulated = true,
    } = options;

    await dbConnect();

    try {
      // Create the resume
      const resume = await Resume.create({
        userId,
        content,
      });

      // Create metadata if provided
      if (metadata) {
        const resumeMetadata = await ResumeMetadata.create({
          userId,
          resumeId: resume._id,
          jobTitle: metadata.jobTitle || 'Untitled',
          companyName: metadata.companyName || '',
          resumeName: metadata.resumeName,
        });

        resume.metadata = resumeMetadata._id;
        await resume.save();
      }

      logger.info('Resume created', { userId, resumeId: resume._id });

      // Return populated if requested
      if (returnPopulated && metadata) {
        return this.getResumeWithMetadata(resume._id);
      }

      return resume;
    } catch (error) {
      logger.error('Error creating resume', error, { userId });
      throw error;
    }
  },

  /**
   * Update resume content.
   * @param {string} resumeId - The resume ID
   * @param {object} content - The new content
   * @param {boolean} returnNew - Return updated document (default: true)
   * @returns {Promise<object>} Updated resume object
   */
  async updateResumeContent(resumeId, content, returnNew = true) {
    await dbConnect();

    try {
      const resume = await Resume.findByIdAndUpdate(
        resumeId,
        { $set: { content } },
        { new: returnNew }
      );

      if (!resume) {
        logger.warn('Resume not found for update', { resumeId });
        throw new Error('Resume not found');
      }

      logger.info('Resume content updated', { resumeId });
      return resume;
    } catch (error) {
      logger.error('Error updating resume content', error, { resumeId });
      throw error;
    }
  },

  /**
   * Update resume metadata.
   * @param {string} metadataId - The metadata ID
   * @param {object} updates - Fields to update {jobTitle?, companyName?}
   * @param {boolean} returnNew - Return updated document (default: true)
   * @returns {Promise<object>} Updated metadata object
   */
  async updateResumeMetadata(metadataId, updates, returnNew = true) {
    await dbConnect();

    try {
      const metadata = await ResumeMetadata.findByIdAndUpdate(
        metadataId,
        updates,
        { new: returnNew }
      );

      if (!metadata) {
        logger.warn('Resume metadata not found for update', { metadataId });
        throw new Error('Resume metadata not found');
      }

      logger.info('Resume metadata updated', { metadataId });
      return metadata;
    } catch (error) {
      logger.error('Error updating resume metadata', error, { metadataId });
      throw error;
    }
  },

  /**
   * Delete a resume and its metadata.
   * @param {string} resumeId - The resume ID
   * @param {object} options - Deletion options
   * @param {boolean} options.deleteMetadata - Also delete associated metadata (default: true)
   * @returns {Promise<object>} Deleted resume object
   */
  async deleteResume(resumeId, options = {}) {
    const {
      deleteMetadata = true,
    } = options;

    await dbConnect();

    try {
      // Get resume first to get metadata ID
      const resume = await Resume.findById(resumeId);
      
      if (!resume) {
        logger.warn('Resume not found for deletion', { resumeId });
        throw new Error('Resume not found');
      }

      // Delete metadata if requested and exists
      if (deleteMetadata && resume.metadata) {
        await ResumeMetadata.findByIdAndDelete(resume.metadata);
        logger.debug('Resume metadata deleted', { metadataId: resume.metadata });
      }

      // Delete the resume
      await Resume.findByIdAndDelete(resumeId);
      
      logger.info('Resume deleted', { resumeId });
      return resume;
    } catch (error) {
      logger.error('Error deleting resume', error, { resumeId });
      throw error;
    }
  },

  /**
   * Get just the resume content (without metadata or other fields).
   * @param {string} resumeId - The resume ID
   * @returns {Promise<object>} Resume content
   */
  async getResumeContent(resumeId) {
    const resume = await this.getResumeById(resumeId, {
      select: 'content',
      lean: true,
    });
    return resume.content;
  },
};
