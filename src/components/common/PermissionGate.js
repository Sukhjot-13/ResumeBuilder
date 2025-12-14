'use client';

import { checkPermission, getPermissionMetadata } from '@/lib/accessControl';
import PremiumFeatureLock from './PremiumFeatureLock';

/**
 * A wrapper component that conditionally renders children based on permission.
 * If the user lacks permission, it shows a PremiumFeatureLock instead.
 * 
 * @param {object} props
 * @param {object} props.user - User object with role property.
 * @param {string} props.permission - The permission to check (from PERMISSIONS).
 * @param {React.ReactNode} props.children - Content to render if permitted.
 * @param {'default' | 'compact' | 'hidden'} props.fallback - How to handle denied access.
 *   - 'default': Show full PremiumFeatureLock.
 *   - 'compact': Show compact PremiumFeatureLock.
 *   - 'hidden': Render nothing if denied.
 */
export default function PermissionGate({ 
  user, 
  permission, 
  children, 
  fallback = 'default' 
}) {
  // If no user or no permission specified, render children (fail open for UX, API will block)
  if (!user || !permission) {
    return children;
  }

  const hasAccess = checkPermission(user, permission);

  if (hasAccess) {
    return children;
  }

  // Handle fallback based on variant
  if (fallback === 'hidden') {
    return null;
  }

  const metadata = getPermissionMetadata(permission);

  return (
    <PremiumFeatureLock
      featureName={metadata?.name || 'Premium Feature'}
      description={metadata?.description}
      planName={metadata?.requiredPlan || 'PRO'}
      variant={fallback}
    />
  );
}
