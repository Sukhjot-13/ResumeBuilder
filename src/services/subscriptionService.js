import User from '@/models/User';
import Plan from '@/models/plan';
import { PLANS, PERMISSIONS, ROLES } from '@/lib/constants';
import { hasPermission } from '@/lib/utils';

export const SubscriptionService = {
  getLimit(user) {
    // If admin or has unlimited permission
    if (hasPermission(user.role, PERMISSIONS.UNLIMITED_CREDITS)) {
      return Infinity;
    }
    
    // If user has a plan, use plan limits
    // Assuming populated plan or we fetch it. 
    // For now, let's use the constants based on some logic or assume plan is populated.
    // If plan is just an ID, we might need to fetch it or rely on hardcoded constants for now.
    // The previous logic didn't really use the plan object from DB for limits, it used constants.
    // Let's stick to constants for simplicity as per current setup.
    
    // Check if user is PRO (subscriber role or subscriptionId present)
    // This logic might need to be more robust with actual Plan model, but for now:
    if (user.role === 99 || user.subscriptionId) { // SUBSCRIBER
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
    if (!user) throw new Error('User not found');

    // Check and reset limits if needed
    await this.checkAndResetDailyLimits(user);

    const limit = this.getLimit(user);

    if (limit === Infinity) {
      return true;
    }

    if ((user.creditsUsed || 0) + amount > limit) {
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
    if (!user) throw new Error('User not found');

    // Check and reset limits if needed
    await this.checkAndResetDailyLimits(user);

    const limit = this.getLimit(user);

    if (limit === Infinity) {
      return true;
    }

    return (user.creditsUsed || 0) + amount <= limit;
  },

  // Reset usage (daily/monthly)
  async checkAndResetDailyLimits(user) {
    if (!user) return;

    // If user is PRO (subscriber), we don't reset daily.
    // Their reset happens on monthly renewal via webhook.
    if (user.role === ROLES.SUBSCRIBER) {
      return;
    }

    // For FREE users, check if we need to reset
    const now = new Date();
    const lastReset = user.lastCreditResetDate ? new Date(user.lastCreditResetDate) : new Date(0);
    
    // Check if it's a different day
    const isDifferentDay = 
      now.getDate() !== lastReset.getDate() ||
      now.getMonth() !== lastReset.getMonth() ||
      now.getFullYear() !== lastReset.getFullYear();

    if (isDifferentDay) {
      console.log(`🔄 Resetting daily credits for user ${user._id}`);
      user.creditsUsed = 0;
      user.lastCreditResetDate = now;
      await user.save();
    }
  },
  
  async resetUsage(userId) {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');
      user.creditsUsed = 0;
      user.lastCreditResetDate = new Date();
      await user.save();
      return true;
  }
};
