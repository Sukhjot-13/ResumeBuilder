import CoverLetter from '@/models/CoverLetter';
import dbConnect from '@/lib/mongodb';
import { logger } from '@/lib/logger';

/**
 * CoverLetter Service
 *
 * Centralized service for all cover letter database operations.
 * Mirrors the pattern in resumeService.js.
 */
export const CoverLetterService = {
  /**
   * Get a single cover letter by ID, scoped to userId.
   * @param {string} id - The cover letter ID
   * @param {string} userId - The owner's user ID
   * @param {object} [options] - Query options
   * @param {boolean} [options.lean=true] - Return plain JS object
   * @param {boolean} [options.throwOnNotFound=false] - Throw if not found
   * @returns {Promise<object|null>} Cover letter document or null
   */
  async getCoverLetterById(id, userId, options = {}) {
    const {
      lean = true,
      throwOnNotFound = false,
    } = options;

    await dbConnect();

    try {
      let query = CoverLetter.findOne({ _id: id, userId });

      if (lean) {
        query = query.lean();
      }

      const letter = await query;

      if (!letter && throwOnNotFound) {
        logger.warn('Cover letter not found', { id, userId });
        throw new Error('Cover letter not found');
      }

      return letter;
    } catch (error) {
      logger.error('Error fetching cover letter', error, { id, userId });
      throw error;
    }
  },

  /**
   * Get all cover letters for a user.
   * @param {string} userId - The user ID
   * @param {object} [options] - Query options
   * @param {number} [options.limit=50] - Max results
   * @param {object} [options.sort] - Sort order (default: { createdAt: -1 })
   * @param {boolean} [options.lean=true] - Return plain JS objects
   * @returns {Promise<Array>} Array of cover letter documents
   */
  async getCoverLettersByUserId(userId, options = {}) {
    const {
      limit = 50,
      sort = { createdAt: -1 },
      lean = true,
    } = options;

    await dbConnect();

    try {
      let query = CoverLetter.find({ userId }).sort(sort);

      if (limit > 0) {
        query = query.limit(limit);
      }

      if (lean) {
        query = query.lean();
      }

      const letters = await query;
      logger.debug('Fetched cover letters for user', { userId, count: letters.length });
      return letters;
    } catch (error) {
      logger.error('Error fetching cover letters by user ID', error, { userId });
      throw error;
    }
  },

  /**
   * Create a new cover letter.
   * @param {string} userId - The user ID
   * @param {object} content - Cover letter content
   * @param {object} [metadata] - Optional metadata { jobTitle, companyName, coverLetterName }
   * @returns {Promise<object>} Created cover letter
   */
  async createCoverLetter(userId, content, metadata = {}) {
    await dbConnect();

    try {
      const doc = await CoverLetter.create({
        userId,
        content,
        metadata: {
          jobTitle: metadata.jobTitle || '',
          companyName: metadata.companyName || '',
          coverLetterName: metadata.coverLetterName || `Cover Letter - ${metadata.companyName || 'Unknown'}`,
        },
      });

      logger.info('Cover letter created', { userId, coverLetterId: doc._id });
      return doc;
    } catch (error) {
      logger.error('Error creating cover letter', error, { userId });
      throw error;
    }
  },

  /**
   * Update a cover letter's content and/or metadata.
   * @param {string} id - The cover letter ID
   * @param {string} userId - The owner's user ID
   * @param {object} updates - Fields to update { content?, metadata? }
   * @param {boolean} [returnNew=true] - Return updated document
   * @returns {Promise<object|null>} Updated cover letter or null if not found
   */
  async updateCoverLetter(id, userId, updates, returnNew = true) {
    await dbConnect();

    try {
      const update = {};
      if (updates.content !== undefined) update.content = updates.content;
      if (updates.metadata !== undefined) update.metadata = updates.metadata;

      const letter = await CoverLetter.findOneAndUpdate(
        { _id: id, userId },
        { $set: update },
        { new: returnNew }
      );

      if (!letter) {
        logger.warn('Cover letter not found for update', { id, userId });
        return null;
      }

      logger.info('Cover letter updated', { id, userId });
      return letter;
    } catch (error) {
      logger.error('Error updating cover letter', error, { id, userId });
      throw error;
    }
  },

  /**
   * Delete a cover letter.
   * @param {string} id - The cover letter ID
   * @param {string} userId - The owner's user ID
   * @returns {Promise<object|null>} Deleted cover letter or null if not found
   */
  async deleteCoverLetter(id, userId) {
    await dbConnect();

    try {
      const letter = await CoverLetter.findOneAndDelete({ _id: id, userId });

      if (!letter) {
        logger.warn('Cover letter not found for deletion', { id, userId });
        return null;
      }

      logger.info('Cover letter deleted', { id, userId });
      return letter;
    } catch (error) {
      logger.error('Error deleting cover letter', error, { id, userId });
      throw error;
    }
  },
};
