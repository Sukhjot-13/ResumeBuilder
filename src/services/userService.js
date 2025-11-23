import User from '@/models/User';
import dbConnect from '@/lib/mongodb';
import { logger } from '@/lib/logger';

/**
 * User Service
 * 
 * Centralized service for all user-related database operations.
 * Each function has a single responsibility and uses parameters for flexibility.
 */

export const UserService = {
  /**
   * Get a user by ID.
   * @param {string} userId - The user ID
   * @param {object} options - Query options
   * @param {boolean} options.populate - Whether to populate references (default: false)
   * @param {string|string[]} options.populateFields - Fields to populate (default: 'mainResume')
   * @param {string} options.select - Fields to select (default: all fields)
   * @param {boolean} options.lean - Return plain JS object instead of Mongoose document (default: false)
   * @param {boolean} options.throwOnNotFound - Throw error if user not found (default: true)
   * @returns {Promise<object|null>} User object or null
   */
  async getUserById(userId, options = {}) {
    const {
      populate = false,
      populateFields = 'mainResume',
      select = '',
      lean = false,
      throwOnNotFound = true,
    } = options;

    await dbConnect();

    try {
      let query = User.findById(userId);

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

      const user = await query;

      if (!user && throwOnNotFound) {
        logger.warn('User not found', { userId });
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      logger.error('Error fetching user by ID', error, { userId });
      throw error;
    }
  },

  /**
   * Get a user with their main resume populated.
   * Convenience wrapper around getUserById.
   * @param {string} userId - The user ID
   * @param {boolean} throwOnNotFound - Throw error if user not found (default: true)
   * @returns {Promise<object|null>} User object with mainResume populated
   */
  async getUserWithMainResume(userId, throwOnNotFound = true) {
    return this.getUserById(userId, {
      populate: true,
      populateFields: 'mainResume',
      throwOnNotFound,
    });
  },

  /**
   * Get a user with their generated resumes populated.
   * @param {string} userId - The user ID
   * @param {boolean} throwOnNotFound - Throw error if user not found (default: true)
   * @returns {Promise<object|null>} User object with generatedResumes populated
   */
  async getUserWithResumes(userId, throwOnNotFound = true) {
    return this.getUserById(userId, {
      populate: true,
      populateFields: ['generatedResumes', 'mainResume'],
      throwOnNotFound,
    });
  },

  /**
   * Get just the user's role.
   * @param {string} userId - The user ID
   * @returns {Promise<number>} User role number
   */
  async getUserRole(userId) {
    const user = await this.getUserById(userId, {
      select: 'role',
      lean: true,
    });
    return user.role;
  },

  /**
   * Update a user's role.
   * @param {string} userId - The user ID
   * @param {number} newRole - The new role value
   * @param {boolean} returnNew - Return the updated document (default: true)
   * @returns {Promise<object>} Updated user object
   */
  async updateUserRole(userId, newRole, returnNew = true) {
    await dbConnect();

    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { role: newRole },
        { new: returnNew }
      );

      if (!user) {
        logger.warn('User not found for role update', { userId });
        throw new Error('User not found');
      }

      logger.info('User role updated', { userId, newRole });
      return user;
    } catch (error) {
      logger.error('Error updating user role', error, { userId, newRole });
      throw error;
    }
  },

  /**
   * Set a user's credits to a specific value.
   * @param {string} userId - The user ID
   * @param {number} credits - The new credits value
   * @returns {Promise<object>} Updated user object
   */
  async setUserCredits(userId, credits) {
    await dbConnect();

    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { creditsUsed: credits },
        { new: true }
      );

      if (!user) {
        logger.warn('User not found for credits update', { userId });
        throw new Error('User not found');
      }

      logger.info('User credits set', { userId, credits });
      return user;
    } catch (error) {
      logger.error('Error setting user credits', error, { userId, credits });
      throw error;
    }
  },

  /**
   * Increment user's credits by a specific amount.
   * @param {string} userId - The user ID
   * @param {number} amount - Amount to increment (can be negative to decrement)
   * @returns {Promise<object>} Updated user object
   */
  async incrementUserCredits(userId, amount) {
    await dbConnect();

    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $inc: { creditsUsed: amount } },
        { new: true }
      );

      if (!user) {
        logger.warn('User not found for credits increment', { userId });
        throw new Error('User not found');
      }

      logger.info('User credits incremented', { userId, amount });
      return user;
    } catch (error) {
      logger.error('Error incrementing user credits', error, { userId, amount });
      throw error;
    }
  },

  /**
   * Update user fields.
   * Generic update function for flexibility.
   * @param {string} userId - The user ID
   * @param {object} updateData - Object with fields to update
   * @param {object} options - Update options
   * @param {boolean} options.returnNew - Return updated document (default: true)
   * @param {boolean} options.runValidators - Run schema validators (default: true)
   * @returns {Promise<object>} Updated user object
   */
  async updateUser(userId, updateData, options = {}) {
    const {
      returnNew = true,
      runValidators = true,
    } = options;

    await dbConnect();

    try {
      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { 
          new: returnNew,
          runValidators,
        }
      );

      if (!user) {
        logger.warn('User not found for update', { userId });
        throw new Error('User not found');
      }

      logger.info('User updated', { userId, updateData: Object.keys(updateData) });
      return user;
    } catch (error) {
      logger.error('Error updating user', error, { userId });
      throw error;
    }
  },

  /**
   * Add a resume to user's generated resumes array.
   * @param {string} userId - The user ID
   * @param {string} resumeId - The resume ID to add
   * @returns {Promise<object>} Updated user object
   */
  async addGeneratedResume(userId, resumeId) {
    await dbConnect();

    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $push: { generatedResumes: resumeId } },
        { new: true }
      );

      if (!user) {
        logger.warn('User not found for adding generated resume', { userId });
        throw new Error('User not found');
      }

      logger.info('Generated resume added to user', { userId, resumeId });
      return user;
    } catch (error) {
      logger.error('Error adding generated resume', error, { userId, resumeId });
      throw error;
    }
  },

  /**
   * Remove a resume from user's generated resumes array.
   * @param {string} userId - The user ID
   * @param {string} resumeId - The resume ID to remove
   * @returns {Promise<object>} Updated user object
   */
  async removeGeneratedResume(userId, resumeId) {
    await dbConnect();

    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $pull: { generatedResumes: resumeId } },
        { new: true }
      );

      if (!user) {
        logger.warn('User not found for removing generated resume', { userId });
        throw new Error('User not found');
      }

      logger.info('Generated resume removed from user', { userId, resumeId });
      return user;
    } catch (error) {
      logger.error('Error removing generated resume', error, { userId, resumeId });
      throw error;
    }
  },

  /**
   * Set user's main resume.
   * @param {string} userId - The user ID
   * @param {string} resumeId - The resume ID to set as main
   * @returns {Promise<object>} Updated user object
   */
  async setMainResume(userId, resumeId) {
    return this.updateUser(userId, { mainResume: resumeId });
  },
};
