/**
 * API Configuration
 * 
 * Central configuration for API endpoints and base URL
 */

// Backend API base URL
// Update this based on your environment
export const API_BASE_URL = __DEV__ 
  ? 'http://192.168.4.49:3001/api'  // Development (use your local IP for physical devices)
  : 'https://your-production-url.com/api';  // Production

// Gen-AI API base URL
export const GENAI_BASE_URL = __DEV__ 
  ? 'http://192.168.4.49:8000/api'  // Development (use your local IP for physical devices)
  : 'https://your-production-genai-url.com/api';  // Production

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
  },
  // Session endpoints
  SESSIONS: {
    LIST: '/sessions',
    CREATE: '/sessions',
    GET: (id: number) => `/sessions/${id}`,
    UPDATE: (id: number) => `/sessions/${id}`,
    DELETE: (id: number) => `/sessions/${id}`,
    UPLOAD_FRAME: (id: number) => `/sessions/${id}/frames`,
    METRICS: (id: number) => `/sessions/${id}/metrics`,
  },
  // Material endpoints
  MATERIALS: {
    LIST: (sessionId: number) => `/sessions/${sessionId}/materials`,
    CREATE: '/materials',
    GET: (id: number) => `/materials/${id}`,
    UPDATE: (id: number) => `/materials/${id}`,
    DELETE: (id: number) => `/materials/${id}`,
    GENERATE: '/materials/generate',
  },
  // Health check
  HEALTH: '/health',
};

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 30000;

// Default headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};
