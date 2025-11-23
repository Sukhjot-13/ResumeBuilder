import User from '@/models/User';
import { ROLES } from '@/lib/constants';

/**
 * Checks if a user's subscription has expired and downgrades them if necessary.
 * @param {object} user - The user object to check
 * @returns {boolean} - True if user was downgraded, false otherwise
 */
export async function checkAndDowngradeExpiredSubscription(user) {
  if (!user) return false;

  // Only check users who have an active subscription status
  if (user.subscriptionStatus !== 'active') return false;

  // Check if subscription has expired
  const now = new Date();
  const expiresAt = user.subscriptionExpiresAt;

  if (expiresAt && expiresAt < now) {
    // Subscription has expired, downgrade user
    user.role = ROLES.USER; // Downgrade to 100
    user.subscriptionStatus = 'expired';
    await user.save();

    console.log(`⏰ User ${user._id} subscription expired, downgraded to USER (role 100)`);
    return true;
  }

  return false;
}

/**
 * Checks if a user's subscription is currently active and valid
 * @param {object} user - The user object to check
 * @returns {boolean} - True if subscription is active and not expired
 */
export function isSubscriptionActive(user) {
  if (!user || user.subscriptionStatus !== 'active') return false;
  
  const now = new Date();
  const expiresAt = user.subscriptionExpiresAt;
  
  return expiresAt && expiresAt > now;
}
