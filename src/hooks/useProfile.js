"use client";

import { useAuth } from '@/context/AuthContext';

/**
 * useProfile — provides the authenticated user's profile WITHOUT a duplicate
 * network request. Reads from AuthContext (which already GETs /api/user/profile
 * once per page load) instead of fetching again.
 *
 * Returns: { profile, loading, refetch }
 */
export function useProfile() {
  const { loading, isAuthenticated, user, refetch } = useAuth();
  return {
    profile: isAuthenticated ? user : null,
    loading,
    refetch,
  };
}
