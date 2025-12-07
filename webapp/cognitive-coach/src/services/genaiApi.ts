// Gen-AI API Service for direct chat communication
// Bypasses backend - direct communication with gen-ai API
import axios from 'axios';

const GENAI_BASE = 'http://localhost:8000/api';

// Configure axios for gen-ai API calls
const genaiAxios = axios.create({
  baseURL: GENAI_BASE,
  timeout: 30000, // 30 second timeout for chat responses
  headers: {
    'Content-Type': 'application/json'
  }
});

export interface ChatResponse {
  answer: string;
  session_id: string;
  response_time: number;
  conversation_length: number;
  timings: {
    rag_search: number;
    summary_generation: number;
    llm_call: number;
    total: number;
  };
  rag_info: {
    results_count: number;
    results: Array<{
      text: string;
      score: number;
    }>;
  };
}

export interface SessionClearResponse {
  success: boolean;
  message: string;
  session_id: string;
}

export const genaiApi = {
  /**
   * Send a chat message to gen-ai API
   * Direct communication - bypasses backend
   * 
   * @param message - User's chat message
   * @param sessionId - Optional session ID (defaults to 'global' for single-user system)
   * @param sessionContext - Optional session context with session_id, session_title, start_time, end_time, duration, status, created_at, focus_score
   * @returns Chat response with answer and metadata
   */
  chat: async (
    message: string, 
    sessionId?: string,
    sessionContext?: { 
      session_id?: string | number;
      session_title?: string;
      start_time?: string;
      end_time?: string;
      duration?: number;
      status?: string;
      created_at?: string;
      focus_score?: number | null;
    }
  ): Promise<ChatResponse> => {
    try {
      const response = await genaiAxios.post<ChatResponse>('/chat', {
        message,
        session_id: sessionId || 'global',
        session_context: sessionContext || undefined
      });
      return response.data;
    } catch (error: any) {
      console.error('Gen-AI chat error:', error);
      
      // Provide user-friendly error messages
      if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
        throw new Error('Gen-AI service is not available. Please ensure the gen-ai API server is running on port 8000.');
      }
      
      if (error.response?.status === 500) {
        throw new Error('Gen-AI service encountered an error. Please try again.');
      }
      
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail.error || 'Failed to get response from AI');
      }
      
      throw new Error(error.message || 'Failed to send message to AI');
    }
  },

  /**
   * Clear chat session
   * Resets conversation context for the session
   * 
   * @param sessionId - Optional session ID (defaults to 'global')
   * @returns Clear session response
   */
  clearChatSession: async (sessionId?: string): Promise<SessionClearResponse> => {
    try {
      const targetSessionId = sessionId || 'global';
      const response = await genaiAxios.delete<SessionClearResponse>(`/chat/session/${targetSessionId}`);
      return response.data;
    } catch (error: any) {
      console.error('Gen-AI clear session error:', error);
      
      // Don't throw for clear errors - just log
      // User can still continue using chat
      if (error.code === 'ECONNREFUSED') {
        console.warn('Gen-AI service not available for session clear');
        return {
          success: false,
          message: 'Gen-AI service not available',
          session_id: sessionId || 'global'
        };
      }
      
      throw new Error(error.message || 'Failed to clear chat session');
    }
  }
};

