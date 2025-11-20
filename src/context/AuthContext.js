"use client";
import { createContext, useContext, useEffect, useState } from 'react';

// AuthContext holds loading state, auth status, and minimal user info
const AuthContext = createContext({ loading: true, isAuthenticated: false, user: null, refetch: async () => {} });

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({ loading: true, isAuthenticated: false, user: null });

  const fetchProfile = async () => {
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
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, refetch: fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
