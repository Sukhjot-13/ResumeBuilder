import User from '@/models/User';
import { PLANS, PERMISSIONS, ROLES } from '@/lib/constants';
import { checkPermission } from '@/lib/accessControl';
import { isSameDay, now } from '@/lib/dateUtils';
import { logger } from '@/lib/logger';

export const SubscriptionService = {
  /**
   * Determines the credit limit for a user based on their role and subscription.
   * @param {object} user 
   * @returns {number} The credit limit
   */
  getLimit(user) {
    // If admin or has unlimited permission
    if (checkPermission(user, PERMISSIONS.UNLIMITED_CREDITS)) {
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

    // Check and reset limits if needed
    await this.checkAndResetDailyLimits(user);

    const limit = this.getLimit(user);

    if (limit === Infinity) {
      return true;
    }

    if ((user.creditsUsed || 0) + amount > limit) {
      logger.info("User reached credit limit", { userId, creditsUsed: user.creditsUsed, limit });
      return false;
    }

    user.creditsUsed = (user.creditsUsed || 0) + amount;
    await user.save();
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

    const limit = this.getLimit(user);

    if (limit === Infinity) {
      return true;
    }

    return (user.creditsUsed || 0) + amount <= limit;
  },

  /**
   * Reset usage (daily/monthly) if applicable.
   * @param {object} user Mongoose document
   */
  async checkAndResetDailyLimits(user) {
    if (!user) return;

    // If user is PRO (subscriber), we don't reset daily.
    // Their reset happens on monthly renewal via webhook.
    if (user.role === ROLES.SUBSCRIBER) {
      return;
    }

    // For FREE users, check if we need to reset
    const currentDate = now();
    const lastReset = user.lastCreditResetDate ? new Date(user.lastCreditResetDate) : new Date(0);
    
    if (!isSameDay(currentDate, lastReset)) {
      logger.info("Resetting daily credits", { userId: user._id });
      user.creditsUsed = 0;
      user.lastCreditResetDate = currentDate;
      await user.save();
    }
  },
  
  /**
   * Manually reset usage for a user.
   * @param {string} userId 
   * @returns {Promise<boolean>}
   */
  async resetUsage(userId) {
      const user = await User.findById(userId);
      if (!user) {
        logger.error("User not found in resetUsage", null, { userId });
        throw new Error('User not found');
      }
      
      user.creditsUsed = 0;
      user.lastCreditResetDate = now();
      await user.save();
      logger.info("Manually reset usage", { userId });
      return true;
  }
};
