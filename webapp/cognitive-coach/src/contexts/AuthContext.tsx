/**
 * Authentication Context
 * 
 * Provides authentication state and cross-tab logout synchronization
 */

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOGOUT_EVENT_KEY = 'cognitive_coach_logout';
const AUTH_CHECK_KEY = 'cognitive_coach_auth_check';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any | null>(null);
  const navigate = useNavigate();

  // Check authentication status
  const checkAuth = async () => {
    try {
      const userData = await api.getCurrentUser();
      setUser(userData);
      setIsAuthenticated(!!userData);
      return !!userData;
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      return false;
    }
  };

  // Initialize auth state on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Listen for logout events from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Logout event from another tab
      if (e.key === LOGOUT_EVENT_KEY && e.newValue) {
        console.log('Logout detected from another tab');
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('user');
        navigate('/login');
      }
      
      // Auth check event from another tab (after login in another tab)
      if (e.key === AUTH_CHECK_KEY && e.newValue) {
        console.log('Auth change detected from another tab');
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [navigate]);

  // Logout function
  const logout = async () => {
    try {
      // Call backend logout
      await api.logout();
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      // Clear local state
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user');
      
      // Broadcast logout to other tabs
      localStorage.setItem(LOGOUT_EVENT_KEY, Date.now().toString());
      
      // Clean up the logout event key after a short delay
      setTimeout(() => {
        localStorage.removeItem(LOGOUT_EVENT_KEY);
      }, 100);
      
      // Navigate to login
      navigate('/login');
    }
  };

  // Refresh auth (can be called after login)
  const refreshAuth = async () => {
    await checkAuth();
    // Notify other tabs to refresh auth
    localStorage.setItem(AUTH_CHECK_KEY, Date.now().toString());
    setTimeout(() => {
      localStorage.removeItem(AUTH_CHECK_KEY);
    }, 100);
  };

  const value: AuthContextType = {
    isAuthenticated,
    user,
    logout,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
