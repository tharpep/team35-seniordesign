/**
 * Authentication Context
 * 
 * Provides authentication state and functions throughout the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/auth.service';
import { apiService, User } from '../services/api.service';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = '@cognitive_coach_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from storage on app start
  useEffect(() => {
    loadStoredAuth();
  }, []);

  /**
   * Load authentication data from storage
   */
  const loadStoredAuth = async () => {
    try {
      setIsLoading(true);
      
      // Load user data
      const storedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        
        // Verify session is still valid
        const isValid = await authService.checkAuth();
        if (!isValid) {
          // Session expired, clear stored data
          await clearStoredAuth();
        }
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      await clearStoredAuth();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Save authentication data to storage
   */
  const saveToStorage = async (userData: User) => {
    try {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving auth to storage:', error);
    }
  };

  /**
   * Clear authentication data from storage
   */
  const clearStoredAuth = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setUser(null);
    } catch (error) {
      console.error('Error clearing stored auth:', error);
    }
  };

  /**
   * Login user
   */
  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authService.login({ email, password });

      if (response.error || !response.data) {
        return {
          success: false,
          error: response.message || response.error || 'Login failed',
        };
      }

      const userData = response.data.user;
      setUser(userData);

      // Save user data (axios handles cookies automatically)
      await saveToStorage(userData);

      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  };

  /**
   * Register new user
   */
  const register = async (
    userData: RegisterData
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authService.register(userData);

      if (response.error || !response.data) {
        return {
          success: false,
          error: response.message || response.error || 'Registration failed',
        };
      }

      const newUser = response.data.user;
      setUser(newUser);

      // Save user data (axios handles cookies automatically)
      await saveToStorage(newUser);

      return { success: true };
    } catch (error: any) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await clearStoredAuth();
    }
  };

  /**
   * Refresh user data
   */
  const refreshUser = async () => {
    try {
      const response = await authService.getCurrentUser();
      if (response.data?.user) {
        setUser(response.data.user);
        
        // Update storage (axios handles cookies automatically)
        await saveToStorage(response.data.user);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
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
