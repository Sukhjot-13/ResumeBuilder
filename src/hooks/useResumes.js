"use client";

import { useState, useCallback } from 'react';
import { useApiClient } from '@/hooks/useApiClient';
import { API_ENDPOINTS } from '@/lib/constants';
import { checkPermission } from '@/lib/accessControl';
import { PERMISSIONS } from '@/lib/constants';

/**
 * useResumes — handles all resume CRUD operations for the current user.
 *
 * @param {object|null} profile - The current user's profile (used for permission checks).
 * Returns: { resumes, deletingId, fetchResumes, createResume, deleteResume }
 */
export function useResumes(profile) {
  const [resumes, setResumes] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const apiClient = useApiClient();

  const fetchResumes = useCallback(async () => {
    if (!profile || !checkPermission(profile, PERMISSIONS.VIEW_OWN_RESUMES)) return;
    try {
      const res = await apiClient(API_ENDPOINTS.RESUMES.LIST);
      if (res.ok) {
        const data = await res.json();
        setResumes(data);
      } else {
        console.error('Failed to fetch resumes');
      }
    } catch (err) {
      console.error('Error fetching resumes:', err);
    }
  }, [apiClient, profile]);

  const createResume = useCallback(async (content, metadata) => {
    const res = await apiClient(API_ENDPOINTS.RESUMES.LIST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, metadata }),
    });
    if (res.ok) {
      const newResume = await res.json();
      setResumes((prev) => [newResume, ...prev]);
      return newResume;
    }
    return null;
  }, [apiClient]);

  const deleteResume = useCallback(async (resumeId) => {
    setDeletingId(resumeId);
    try {
      const res = await apiClient(API_ENDPOINTS.RESUMES.BY_ID(resumeId), {
        method: 'DELETE',
      });
      if (res.ok) {
        setResumes((prev) => prev.filter((r) => r._id !== resumeId));
      } else {
        console.error('Error deleting resume:', await res.text());
      }
    } catch (err) {
      console.error('Error deleting resume:', err);
    } finally {
      setDeletingId(null);
    }
  }, [apiClient]);

  return { resumes, deletingId, fetchResumes, createResume, deleteResume };
}
