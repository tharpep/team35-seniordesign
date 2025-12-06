// API Service for backend communication
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

// Configure axios to send cookies with requests
axios.defaults.withCredentials = true;

export const api = {
  // Get all materials for a session
  getMaterials: async (sessionId: string): Promise<any[]> => {
    try {
      const response = await axios.get(`${API_BASE}/sessions/${sessionId}/materials`);
      return response.data.materials || [];
    } catch (error) {
      console.error('Error fetching materials:', error);
      return [];
    }
  },

  // Get all sessions for user
  getSessions: async (): Promise<any[]> => {
    try {
      const response = await axios.get(`${API_BASE}/sessions`);
      return response.data.sessions || [];
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  },

  // Get incomplete session (active or paused)
  getIncompleteSession: async (): Promise<any | null> => {
    try {
      console.log('API: Fetching incomplete session from:', `${API_BASE}/sessions/incomplete`);
      const response = await axios.get(`${API_BASE}/sessions/incomplete`);
      console.log('API: Incomplete session response:', response.data);
      return response.data.session;
    } catch (error) {
      console.error('Error fetching incomplete session:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
      }
      return null;
    }
  },

  // Create new session
  createSession: async (sessionData: any): Promise<any> => {
    try {
      const response = await axios.post(`${API_BASE}/sessions`, sessionData);
      return response.data.session;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  },

  // Update session (pause/stop/resume)
  updateSession: async (sessionId: string, updates: any): Promise<any> => {
    try {
      const response = await axios.put(`${API_BASE}/sessions/${sessionId}`, updates);
      return response.data.session;
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  },

  // Upload captured frame
  uploadFrame: async (sessionId: string, frameData: Blob, frameType: 'webcam' | 'screen' | 'external'): Promise<any> => {
    try {
      const formData = new FormData();
      formData.append('type', frameType); // append metadata first so multer can read it in destination callback
      formData.append('frame', frameData, `${frameType}_${Date.now()}.jpg`);
      
      const response = await axios.post(
        `${API_BASE}/sessions/${sessionId}/frames`,
        formData,
        { 
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error uploading frame:', error);
      throw error;
    }
  },

  // Login
  login: async (email: string, password: string): Promise<any> => {
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, { email, password });
      return response.data;
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      await axios.post(`${API_BASE}/auth/logout`);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  // Get current user
  getCurrentUser: async (): Promise<any> => {
    try {
      const response = await axios.get(`${API_BASE}/auth/me`);
      return response.data.user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },

  // Register new user
  register: async (email: string, password: string, firstName: string, lastName: string): Promise<any> => {
    try {
      const response = await axios.post(`${API_BASE}/auth/register`, { 
        email, 
        password,
        first_name: firstName,
        last_name: lastName
      });
      return response.data;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  },

  // Generate artifact via gen-ai and inject into database
  generateArtifact: async (
    sessionId: string,
    type: 'flashcard' | 'mcq' | 'insights',
    topic?: string
  ): Promise<any> => {
    try {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }

      const response = await axios.post(`${API_BASE}/materials/generate`, {
        session_id: sessionId,
        type: type,
        topic: topic || "Newton's laws of motion",
        num_items: 1
      });
      return response.data.material;
    } catch (error: any) {
      console.error('Error generating artifact:', error);
      
      // Provide more specific error messages
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      
      if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
        throw new Error('Backend server is not available. Please ensure the backend is running on port 3001.');
      }
      
      if (error.message) {
        throw new Error(error.message);
      }
      
      throw new Error('Failed to generate artifact. Please check the console for details.');
    }
  }
};