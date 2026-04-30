"use client";

import { useCallback } from 'react';

/**
 * A simple fetch wrapper that ensures cookies are always sent with requests.
 * Authentication is handled entirely server-side via the middleware proxy,
 * which reads HttpOnly cookies and injects x-user-id into API route headers.
 * No client-side token reading needed.
 */
export function useApiClient() {
  const apiClient = useCallback(async (url, options = {}) => {
    return fetch(url, {
      ...options,
      credentials: 'include', // Always send cookies (httpOnly tokens)
    });
  }, []);

  return apiClient;
}
