/**
 * API Service
 * 
 * Handles all HTTP requests to the backend API
 * Uses axios with credentials like the web frontend
 */

import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// Configure axios to send cookies with requests (same as web frontend)
axios.defaults.withCredentials = true;
axios.defaults.timeout = 30000; // 30 seconds

// Add response interceptor to log cookies (for debugging)
axios.interceptors.response.use(
  (response) => {
    console.log('[API] Response received:', {
      url: response.config.url,
      status: response.status,
      hasCookies: !!response.headers['set-cookie']
    });
    return response;
  },
  (error) => {
    console.error('[API] Request failed:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message
    });
    return Promise.reject(error);
  }
);

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthResponse {
  user: User;
  sessionId?: string; // Session ID returned by backend
  message: string;
}

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      console.log(`[API] GET ${this.baseURL}${endpoint}`);
      const response = await axios.get(`${this.baseURL}${endpoint}`);
      console.log('[API] GET Success');
      return { data: response.data };
    } catch (error: any) {
      console.error('[API] GET Error:', error.response?.data || error.message);
      return {
        error: error.response?.data?.error || 'Request failed',
        message: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    try {
      console.log(`[API] POST ${this.baseURL}${endpoint}`);
      const response = await axios.post(`${this.baseURL}${endpoint}`, body);
      console.log('[API] POST Success');
      return { data: response.data };
    } catch (error: any) {
      console.error('[API] POST Error:', error.response?.data || error.message);
      return {
        error: error.response?.data?.error || 'Request failed',
        message: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    try {
      console.log(`[API] PUT ${this.baseURL}${endpoint}`);
      const response = await axios.put(`${this.baseURL}${endpoint}`, body);
      console.log('[API] PUT Success');
      return { data: response.data };
    } catch (error: any) {
      console.error('[API] PUT Error:', error.response?.data || error.message);
      return {
        error: error.response?.data?.error || 'Request failed',
        message: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      console.log(`[API] DELETE ${this.baseURL}${endpoint}`);
      const response = await axios.delete(`${this.baseURL}${endpoint}`);
      console.log('[API] DELETE Success');
      return { data: response.data };
    } catch (error: any) {
      console.error('[API] DELETE Error:', error.response?.data || error.message);
      return {
        error: error.response?.data?.error || 'Request failed',
        message: error.response?.data?.message || error.message,
      };
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
