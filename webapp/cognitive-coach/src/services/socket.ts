// WebSocket Service for real-time updates
import { io, Socket } from 'socket.io-client';

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