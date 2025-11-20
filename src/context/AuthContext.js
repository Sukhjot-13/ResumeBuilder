"use client";
import { createContext, useContext, useEffect, useState } from 'react';

// AuthContext holds loading state, auth status, and minimal user info
const AuthContext = createContext({ loading: true, isAuthenticated: false, user: null, refetch: async () => {} });

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({ loading: true, isAuthenticated: false, user: null });

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile');
      const data = await res.json();
      setState({
        loading: false,
        isAuthenticated: data.ok,
        user: data.ok ? data.user : null,
      });
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
