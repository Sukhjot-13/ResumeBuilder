'use client';

import { checkPermission, getPermissionMetadata } from '@/lib/accessControl';
import PremiumFeatureLock from './PremiumFeatureLock';
import AccessDenied from './AccessDenied';

/**
 * A wrapper component that conditionally renders children based on permission.
 * If the user lacks permission, it shows a PremiumFeatureLock instead.
 * 
 * @param {object} props
 * @param {object} props.user - User object with role property.
 * @param {string} props.permission - The permission to check (from PERMISSIONS).
 * @param {React.ReactNode} props.children - Content to render if permitted.
 * @param {'default' | 'compact' | 'hidden' | 'simple'} props.fallback - How to handle denied access.
 *   - 'default': Show full PremiumFeatureLock.
 *   - 'compact': Show compact PremiumFeatureLock.
 *   - 'simple': Show simple AccessDenied (no upsell).
 *   - 'hidden': Render nothing if denied.
 */
export default function PermissionGate({ 
  user, 
  permission, 
  children, 
  fallback = 'default' 
}) {
  // If no permission is specified, the gate is not configured — pass through.
  // If no user is present, deny — never show gated content to unauthenticated users.
  if (!permission) return children;
  if (!user) return null;

  const hasAccess = checkPermission(user, permission);

  if (hasAccess) {
    return children;
  }

  // Handle fallback based on variant
  if (fallback === 'hidden') {
    return null;
  }

  if (fallback === 'simple') {
    return <AccessDenied />;
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
