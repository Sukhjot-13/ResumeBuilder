import User from '@/models/User';
import { PLANS, PERMISSIONS, ROLES } from '@/lib/constants';
import { checkPermissionDB } from '@/lib/accessControl';
import { now } from '@/lib/dateUtils';
import { logger } from '@/lib/logger';

export const SubscriptionService = {
  /**
   * Determines the credit limit for a user based on their role and subscription.
   * Uses DB-backed permission check so admin revocations apply immediately.
   * @param {object} user
   * @returns {Promise<number>} The credit limit
   */
  async getLimit(user) {
    // If admin or has unlimited permission (DB-first with constants fallback)
    if (await checkPermissionDB(user.role, PERMISSIONS.UNLIMITED_CREDITS)) {
      return Infinity;
    }

    // Check if user is PRO (subscriber role or subscriptionId present)
    if (user.role === ROLES.SUBSCRIBER || user.subscriptionId) {
      return PLANS.PRO.credits;
    }

    return PLANS.FREE.credits;
  },

  /**
   * Track usage for a user.
   * @param {string} userId
   * @param {number} amount
   * @returns {Promise<boolean>} true if successful, false if limit reached
   */
  async trackUsage(userId, amount = 1) {
    const user = await User.findById(userId);
    if (!user) {
      logger.error("User not found in trackUsage", null, { userId });
      throw new Error('User not found');
    }

    // Check and reset limits if needed (handles daily reset logic)
    await this.checkAndResetDailyLimits(user);

    const limit = await this.getLimit(user);

    if (limit === Infinity) {
      return true;
    }

    // Atomic deduction: Only increment if condition matches
    const result = await User.findOneAndUpdate(
      { 
        _id: userId,
        creditsUsed: { $lte: limit - amount } // Ensure we don't exceed limit
      },
      { $inc: { creditsUsed: amount } },
      { new: true }
    );

    if (!result) {
      // If result is null, it means the condition failed (not enough credits)
      // We don't need to log this as error, just info
      logger.info("User reached credit limit (Atomic check)", { userId, limit, attempted: amount });
      return false;
    }

    return true;
  },

  /**
   * Check if user has enough remaining credits.
   * @param {string} userId
   * @param {number} amount
   * @returns {Promise<boolean>}
   */
  async hasCredits(userId, amount = 1) {
    const user = await User.findById(userId);
    if (!user) {
      logger.error("User not found in hasCredits", null, { userId });
      throw new Error('User not found');
    }

    // Check and reset limits if needed
    await this.checkAndResetDailyLimits(user);

    const limit = await this.getLimit(user);

    if (limit === Infinity) {
      return true;
    }

    return (user.creditsUsed || 0) + amount <= limit;
  },

  /**
   * Refund previously deducted credits when an operation fails after deduction.
   * Atomic decrement, floored at zero.
   * @param {string} userId
   * @param {number} amount
   * @returns {Promise<boolean>}
   */
  async refundUsage(userId, amount = 1) {
    const result = await User.findOneAndUpdate(
      { _id: userId, creditsUsed: { $gte: amount } },
      { $inc: { creditsUsed: -amount } }
    );

    // Clamp at zero when creditsUsed dipped below the refund amount
    if (!result) {
      await User.updateOne(
        { _id: userId, creditsUsed: { $gt: 0 } },
        { $set: { creditsUsed: 0 } }
      );
    }

    logger.info('Refunded usage', { userId, amount });
    return true;
  },

  /**
   * Reset usage (daily) if applicable — atomic, cannot clobber concurrent $inc deductions.
   * @param {object} user Mongoose document
   */
  async checkAndResetDailyLimits(user) {
    if (!user) return;

    // If user is PRO (subscriber), we don't reset daily.
    // Their reset happens on monthly renewal via webhook.
    if (user.role === ROLES.SUBSCRIBER) {
      return;
    }

    const currentDate = now();
    const startOfToday = new Date(currentDate);
    startOfToday.setHours(0, 0, 0, 0);

    // Atomic: only resets when the last reset happened before today
    const result = await User.updateOne(
      {
        _id: user._id,
        $or: [
          { lastCreditResetDate: { $lt: startOfToday } },
          { lastCreditResetDate: null },
          { lastCreditResetDate: { $exists: false } },
        ],
      },
      { $set: { creditsUsed: 0, lastCreditResetDate: currentDate } }
    );

    if (result.modifiedCount > 0) {
      logger.info("Resetting daily credits", { userId: user._id });
    }
  },

  /**
   * Manually reset usage for a user.
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  async resetUsage(userId) {
    const result = await User.findOneAndUpdate(
      { _id: userId },
      { $set: { creditsUsed: 0, lastCreditResetDate: now() } },
      { new: true }
    );
    if (!result) {
      logger.error("User not found in resetUsage", null, { userId });
      throw new Error('User not found');
    }
    logger.info("Manually reset usage", { userId });
    return true;
  }
};
