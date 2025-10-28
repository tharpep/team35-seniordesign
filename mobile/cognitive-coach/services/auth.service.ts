/**
 * Authentication Service
 * 
 * Handles authentication-related API calls
 */

import { API_ENDPOINTS } from '../config/api';
import { 
  apiService, 
  ApiResponse, 
  User, 
  LoginRequest, 
  RegisterRequest,
  AuthResponse 
} from './api.service';

class AuthService {
  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await apiService.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    return response;
  }

  /**
   * Register new user
   */
  async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await apiService.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      userData
    );
    return response;
  }

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    const response = await apiService.post<{ message: string }>(
      API_ENDPOINTS.AUTH.LOGOUT
    );
    
    // Clear session on logout
    apiService.clearSession();
    
    return response;
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    return apiService.get<{ user: User }>(API_ENDPOINTS.AUTH.ME);
  }

  /**
   * Check if user is authenticated
   */
  async checkAuth(): Promise<boolean> {
    const response = await this.getCurrentUser();
    return !response.error && !!response.data?.user;
  }
}

// Export singleton instance
export const authService = new AuthService();
