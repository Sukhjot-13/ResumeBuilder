
"use client";

import { useCallback } from 'react';

const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
};

export function useApiClient() {
  const apiClient = useCallback(async (url, options = {}) => {
    const accessToken = getCookie('accessToken');

    const headers = {
      ...options.headers,
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, { ...options, headers });

    return response;
  }, []);

  return apiClient;
}
