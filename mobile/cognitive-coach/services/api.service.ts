/**
 * API Service
 * 
 * Handles all HTTP requests to the backend API
 * Includes error handling, request/response interceptors, and session management
 */

import { API_BASE_URL, DEFAULT_HEADERS, REQUEST_TIMEOUT } from '../config/api';

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
  message: string;
}

class ApiService {
  private baseURL: string;
  private sessionCookie: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Make an HTTP request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      
      // Set up headers
      const headers: Record<string, string> = {
        ...DEFAULT_HEADERS,
        ...(options.headers as Record<string, string>),
      };

      // Add session cookie if available
      if (this.sessionCookie) {
        headers['Cookie'] = this.sessionCookie;
      }

      // Set up request options
      const config: RequestInit = {
        ...options,
        headers,
        credentials: 'include', // Important for session cookies
      };

      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      config.signal = controller.signal;

      // Make request
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      // Extract session cookie from response
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        this.sessionCookie = setCookie;
      }

      // Parse response
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle errors
      if (!response.ok) {
        return {
          error: data.error || 'Request failed',
          message: data.message || `HTTP ${response.status}`,
        };
      }

      return { data };
    } catch (error: any) {
      console.error('API request error:', error);
      
      if (error.name === 'AbortError') {
        return {
          error: 'Request timeout',
          message: 'The request took too long to complete',
        };
      }

      return {
        error: 'Network error',
        message: error.message || 'Could not connect to server',
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Clear session cookie
   */
  clearSession() {
    this.sessionCookie = null;
  }

  /**
   * Set session cookie manually
   */
  setSession(cookie: string) {
    this.sessionCookie = cookie;
  }

  /**
   * Get session cookie
   */
  getSession(): string | null {
    return this.sessionCookie;
  }
}

// Export singleton instance
export const apiService = new ApiService();
