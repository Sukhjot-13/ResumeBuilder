"use client";
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { API_ENDPOINTS } from '@/lib/constants';

// AuthContext holds loading state, auth status, and minimal user info
const AuthContext = createContext({ loading: true, isAuthenticated: false, user: null, refetch: async () => {} });

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({ loading: true, isAuthenticated: false, user: null });

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        // Check if we got user data (email is always present for authenticated users)
        const isAuthenticated = !!data.email;
        setState({
          loading: false,
          isAuthenticated,
          user: isAuthenticated ? data : null,
        });
      } else {
        setState({ loading: false, isAuthenticated: false, user: null });
      }
    } catch (e) {
      setState({ loading: false, isAuthenticated: false, user: null });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    // All setState calls happen asynchronously (after await), never during the effect body
    (async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          const isAuthenticated = !!data.email;
          setState({
            loading: false,
            isAuthenticated,
            user: isAuthenticated ? data : null,
          });
        } else {
          setState({ loading: false, isAuthenticated: false, user: null });
        }
      } catch (e) {
        if (!cancelled) {
          setState({ loading: false, isAuthenticated: false, user: null });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, refetch: fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
