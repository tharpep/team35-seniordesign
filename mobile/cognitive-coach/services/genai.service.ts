/**
 * Gen-AI Service
 * 
 * Handles direct communication with gen-ai API for chat functionality
 * Bypasses backend - communicates directly with gen-ai API
 */

import axios from 'axios';

// Gen-AI API base URL
const GENAI_BASE_URL = __DEV__ 
  ? 'http://127.0.0.1:8000/api'  // Development (use your local IP for physical devices)
  : 'https://your-production-genai-url.com/api';  // Production

// Configure axios for gen-ai API calls
const genaiAxios = axios.create({
  baseURL: GENAI_BASE_URL,
  timeout: 30000, // 30 second timeout for chat responses
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptors for logging
genaiAxios.interceptors.response.use(
  (response) => {
    console.log('[GenAI] Response received:', {
      url: response.config.url,
      status: response.status
    });
    return response;
  },
  (error) => {
    console.error('[GenAI] Request failed:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message
    });
    return Promise.reject(error);
  }
);

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

export interface SessionContext {
  session_id?: string | number;
  session_title?: string;
  session_topic?: string;
  start_time?: string;
  end_time?: string;
  duration?: number;
  status?: string;
  created_at?: string;
  focus_score?: number | null;
}

class GenAIService {
  /**
   * Send a chat message to gen-ai API
   * Direct communication - bypasses backend
   *
   * @param message - User's chat message
   * @param sessionId - Optional session ID (defaults to 'global' for single-user system)
   * @param sessionContext - Optional session context with session_id, session_title, session_topic, etc.
   * @returns Chat response with answer and metadata
   */
  async chat(
    message: string,
    sessionId?: string,
    sessionContext?: SessionContext
  ): Promise<ChatResponse> {
    try {
      console.log('[GenAI] Sending chat message:', { message, sessionId, sessionContext });
      
      const response = await genaiAxios.post<ChatResponse>('/chat', {
        message,
        session_id: sessionId || 'global',
        session_context: sessionContext || undefined
      });
      
      console.log('[GenAI] Chat response received');
      return response.data;
    } catch (error: any) {
      console.error('[GenAI] Chat error:', error);
      
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
  }

  /**
   * Clear chat session
   * Resets conversation context for the session
   * 
   * @param sessionId - Optional session ID (defaults to 'global')
   * @returns Clear session response
   */
  async clearChatSession(sessionId?: string): Promise<SessionClearResponse> {
    try {
      console.log('[GenAI] Clearing chat session:', sessionId);
      
      const response = await genaiAxios.delete<SessionClearResponse>('/chat/session', {
        params: { session_id: sessionId || 'global' }
      });
      
      console.log('[GenAI] Chat session cleared');
      return response.data;
    } catch (error: any) {
      console.error('[GenAI] Clear session error:', error);
      
      // Provide user-friendly error messages
      if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
        throw new Error('Gen-AI service is not available.');
      }
      
      throw new Error(error.message || 'Failed to clear chat session');
    }
  }

  /**
   * Health check for gen-ai API
   * @returns true if API is available, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await genaiAxios.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.warn('[GenAI] Health check failed:', error);
      return false;
    }
  }
}

export const genaiService = new GenAIService();
