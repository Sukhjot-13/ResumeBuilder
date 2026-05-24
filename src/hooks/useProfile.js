"use client";

import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from '@/hooks/useApiClient';
import { API_ENDPOINTS } from '@/lib/constants';

/**
 * useProfile — fetches the authenticated user's profile.
 *
 * Returns: { profile, loading, refetch }
 */
export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const apiClient = useApiClient();

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient(API_ENDPOINTS.USER.PROFILE);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, refetch: fetchProfile };
}
