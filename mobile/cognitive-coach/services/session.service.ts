/**
 * Session Service
 * 
 * Handles session-related API calls for mobile app
 * Mobile app is read-only for sessions (sessions are created via webapp)
 */

import { API_ENDPOINTS } from '../config/api';
import { apiService, ApiResponse } from './api.service';

export interface Session {
  id: number;
  user_id: number;
  title: string;
  context?: string; // Optional topic/context field
  start_time: string;
  end_time: string | null;
  duration: number | null;
  status: 'active' | 'paused' | 'completed';
  focus_score: number | null;
  created_at: string;
}

export interface SessionsResponse {
  sessions: Session[];
}

export interface SessionDetailResponse {
  session: Session;
}

export interface SessionMetricsResponse {
  timeSeries: Array<{
    timestamp: string;
    focus_score: number;
  }>;
  aggregated: {
    avg_focus_score: number;
    max_focus_score: number;
    min_focus_score: number;
  };
}

class SessionService {
  /**
   * Get all sessions for the logged-in user
   */
  async getAllSessions(): Promise<ApiResponse<SessionsResponse>> {
    return apiService.get<SessionsResponse>(API_ENDPOINTS.SESSIONS.LIST);
  }

  /**
   * Get a specific session by ID
   */
  async getSessionById(sessionId: number): Promise<ApiResponse<SessionDetailResponse>> {
    return apiService.get<SessionDetailResponse>(API_ENDPOINTS.SESSIONS.GET(sessionId));
  }

  /**
   * Get session metrics (focus analytics data)
   */
  async getSessionMetrics(sessionId: number): Promise<ApiResponse<SessionMetricsResponse>> {
    return apiService.get<SessionMetricsResponse>(API_ENDPOINTS.SESSIONS.METRICS(sessionId));
  }

  /**
   * Helper: Format session duration for display
   */
  formatDuration(durationInSeconds: number | null): string {
    if (!durationInSeconds) return '0m';
    
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Helper: Format session date for display
   */
  formatSessionDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Today, ${date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago, ${date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    }
  }

  /**
   * Helper: Get status display text
   */
  getStatusDisplay(status: Session['status']): string {
    const statusMap = {
      active: 'In Progress',
      paused: 'Paused',
      completed: 'Completed'
    };
    return statusMap[status] || status;
  }

  /**
   * Helper: Get focus score color
   */
  getFocusScoreColor(score: number | null): string {
    if (!score) return '#666';
    if (score >= 80) return '#4CAF50'; // Green
    if (score >= 60) return '#FFC107'; // Yellow
    return '#FF5722'; // Red
  }
}

// Export singleton instance
export const sessionService = new SessionService();
