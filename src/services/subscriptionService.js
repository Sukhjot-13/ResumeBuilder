import User from '@/models/User';
import Plan from '@/models/plan';
import { PLANS, PERMISSIONS } from '@/lib/constants';
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

    const limit = this.getLimit(user);

    if (limit === Infinity) {
      return true;
    }

    return (user.creditsUsed || 0) + amount <= limit;
  },

  // Reset usage (daily/monthly)
  async checkAndResetDailyLimits(userId) {
    const user = await User.findById(userId);
    if (!user) return;

    // Logic to check if reset is needed (e.g., new day for Free, new month for Pro)
    // For now, we'll just have a method to reset manually or via cron
    // user.creditsUsed = 0;
    // await user.save();
  },
  
  async resetUsage(userId) {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');
      user.creditsUsed = 0;
      await user.save();
      return true;
  }
};
