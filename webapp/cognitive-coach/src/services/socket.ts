// WebSocket Service for real-time updates
import { io, Socket } from 'socket.io-client';

// Facial metrics type definition
export interface FacialMetrics {
  session_id: string;
  frame_id: string;
  timestamp: number;
  face_detected: boolean;
  detection_confidence: number;
  focus_score: number;
  focus_confidence: number;
  gaze_horizontal: number | null;
  gaze_vertical: number | null;
  blink_rate: number | null;
  head_yaw: number | null;
  head_pitch: number | null;
  emotion: string | null;
  emotion_confidence: number | null;
  emotion_probabilities: Record<string, number> | null;
  frame_quality: number;
  lighting_estimate: number | null;
  sharpness: number | null;
  total_latency_ms: number;
  quality_warning: string | null;
  low_confidence_warning: boolean;
}

export interface FatigueEvent {
  session_id: number;
  fatigue_level: number;
  blink_rate: number | null;
}

export interface DistractionEvent {
  session_id: number;
  distraction_type: string;
  focus_score: number;
  gaze_deviation: number;
}

export interface FacialMetricsPayload {
  sessionId: number;
  timestamp: string;
  metrics: FacialMetrics;
  fatigueEvent: FatigueEvent | null;
  distractionEvent: DistractionEvent | null;
}

// Create socket connection
const socket: Socket = io('http://localhost:3001', {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  withCredentials: true
});

// Connection event handlers
socket.on('connect', () => {
  console.log('[Socket.IO] Connected to server:', socket.id);
});

socket.on('disconnect', () => {
  console.log('[Socket.IO] Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('[Socket.IO] Connection error:', error.message);
});

// Subscribe to material updates for a specific session
export const subscribeToMaterials = (
  sessionId: string,
  callback: (material: any) => void
) => {
  console.log(`[Socket] Subscribing to materials for session ${sessionId}`);

  // Join session room
  socket.emit('join-session', { sessionId });

  // Listen for new materials
  socket.on('material-created', callback);
};

// Unsubscribe from material updates
export const unsubscribeFromMaterials = (sessionId: string) => {
  console.log(`[Socket] Unsubscribing from materials for session ${sessionId}`);

  socket.emit('leave-session', { sessionId });
  socket.off('material-created');
};

// Subscribe to facial metrics updates for a specific session
export const subscribeToFacialMetrics = (
  sessionId: string,
  callback: (payload: FacialMetricsPayload) => void
) => {
  console.log(`[Socket] Subscribing to facial metrics for session ${sessionId}`);

  // Join session room (if not already joined)
  socket.emit('join-session', { sessionId });

  // Listen for facial metrics updates
  socket.on('facial-metrics', callback);
};

// Unsubscribe from facial metrics updates
export const unsubscribeFromFacialMetrics = (sessionId: string) => {
  console.log(`[Socket] Unsubscribing from facial metrics for session ${sessionId}`);

  socket.off('facial-metrics');
};

// Subscribe to session updates (status changes, etc.)
export const subscribeToSessionUpdates = (
  sessionId: string,
  callback: (update: any) => void
) => {
  console.log(`[Socket] Subscribing to session updates for ${sessionId}`);
  socket.emit('join-session', { sessionId });
  socket.on('session-updated', callback);
};

// Unsubscribe from session updates
export const unsubscribeFromSessionUpdates = (sessionId: string) => {
  socket.emit('leave-session', { sessionId });
  socket.off('session-updated');
};

// Connection status helpers
export const onConnect = (callback: () => void) => {
  socket.on('connect', callback);
};

export const onDisconnect = (callback: () => void) => {
  socket.on('disconnect', callback);
};

export { socket };