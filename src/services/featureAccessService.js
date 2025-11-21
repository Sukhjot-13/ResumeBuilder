import { ROLES, FEATURE_ACCESS_LEVELS } from '@/lib/constants';

export class FeatureAccessService {
  /**
   * Get the required access level for a specific feature.
   * @param {string} featureName - The name of the feature (key in FEATURE_ACCESS_LEVELS).
   * @returns {number} The required access level (role number).
   */
  static getFeatureAccessLevel(featureName) {
    return FEATURE_ACCESS_LEVELS[featureName] || ROLES.ADMIN; // Default to Admin only if not defined
  }

  /**
   * Check if a user has access to a specific feature.
   * @param {string} featureName - The name of the feature.
   * @param {number} userRole - The user's role number.
   * @returns {boolean} True if the user has access, false otherwise.
   */
  static hasAccess(featureName, userRole) {
    const requiredLevel = this.getFeatureAccessLevel(featureName);
    // In this system, lower number usually means higher privilege (0 is Admin), 
    // but the requirement says "level 99 and above" for pro access.
    // Let's look at the ROLES: ADMIN: 0, DEVELOPER: 70, SUBSCRIBER: 99, USER: 100.
    // So "99 and above" in terms of privilege means <= 99.
    return userRole <= requiredLevel;
  }
}
