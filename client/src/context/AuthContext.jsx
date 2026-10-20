import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children, isGoogleConfigured = false }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('attendtrack_theme') || 'light');

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('attendtrack_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Check existing session
  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('attendtrack_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.success && res.data) {
          setUser(res.data);
        } else {
          localStorage.removeItem('attendtrack_token');
        }
      } catch (err) {
        console.warn('[Auth] Session expired or server unavailable:', err.message);
        localStorage.removeItem('attendtrack_token');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const loginWithGoogle = async (credential) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/google', { credential });
      if (res.success && res.data) {
        localStorage.setItem('attendtrack_token', res.data.token);
        setUser(res.data.user);
        return { success: true };
      }
      return { success: false, message: 'Google authentication failed' };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = async () => {
    setLoading(true);
    try {
      const res = await api.post('/auth/dev-login', {});
      if (res.success && res.data) {
        localStorage.setItem('attendtrack_token', res.data.token);
        setUser(res.data.user);
        return { success: true };
      }
      return { success: false, message: 'Demo login failed' };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('attendtrack_token');
    setUser(null);
  };

  const updateProfile = async (settingsData) => {
    try {
      const res = await api.put('/auth/settings', settingsData);
      if (res.success && res.data) {
        setUser(res.data);
        return { success: true };
      }
      return { success: false, message: 'Failed to update settings' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        theme,
        isGoogleConfigured,
        toggleTheme,
        loginWithGoogle,
        loginAsDemo,
        logout,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
