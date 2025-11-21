import { FEATURE_ACCESS_LEVELS } from './constants';

/**
 * Checks if a user role has access to a specific feature.
 * @param {string} featureName - The name of the feature (from FEATURES enum).
 * @param {number} userRole - The user's role level.
 * @returns {boolean} - True if the user has access, false otherwise.
 */
export function checkFeatureAccess(featureName, userRole) {
  const requiredLevel = FEATURE_ACCESS_LEVELS[featureName];
  
  if (requiredLevel === undefined) {
    console.warn(`Feature access level not defined for: ${featureName}`);
    return false; // Default to deny if not defined
  }

  return userRole <= requiredLevel;
}
