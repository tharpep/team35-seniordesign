const express = require('express');
const session = require('express-session');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

// Import database initialization
const { initializeDatabase } = require('./config/initDatabase');
const { startCleanupScheduler } = require('./services/frameCleanup');
const uptimeTracker = require('./services/uptimeTracker');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow any localhost origin in development
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }
      callback(null, process.env.NODE_ENV !== 'production');
    },
    credentials: true
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173', // Web frontend
      'http://localhost:8081', // Expo default
      'http://localhost:8082', // Expo alternate
    ];
    
    // Allow any localhost origin in development
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else if (process.env.NODE_ENV !== 'production') {
      // In development, allow any origin
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Session configuration
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  name: process.env.SESSION_NAME || 'cognitive_coach_session',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000 // 24 hours
  }
});

app.use(sessionMiddleware);

// Share session with Socket.IO
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Make io accessible in routes
app.set('io', io);

// Routes will be loaded after database initialization

// Health check endpoint (registered early, before route loading)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Cognitive Coach backend is running',
    timestamp: new Date().toISOString()
  });
});

// Uptime and metrics endpoint for compliance reporting
app.get('/api/uptime', (req, res) => {
  res.json(uptimeTracker.getUptimeReport());
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Join session room
  socket.on('join-session', (data) => {
    const { sessionId } = data;
    socket.join(`session-${sessionId}`);
    console.log(`[Socket.IO] Client ${socket.id} joined session-${sessionId}`);
  });

  // Leave session room
  socket.on('leave-session', (data) => {
    const { sessionId } = data;
    socket.leave(`session-${sessionId}`);
    console.log(`[Socket.IO] Client ${socket.id} left session-${sessionId}`);
  });

  // Handle artifact injection broadcasts
  socket.on('inject-artifact', (data) => {
    console.log(`[Socket.IO] Broadcasting injected artifact for session ${data.session_id}`);
    // Broadcast to all clients and session room
    io.emit('material-created', data);
    io.to(`session-${data.session_id}`).emit('material-created', data);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Start server with database initialization
const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    // Initialize database first
    console.log('=================================');
    console.log('🗄️  Initializing Database');
    console.log('=================================\n');
    
    await initializeDatabase();
    
    console.log('=================================');
    console.log('📦 Loading Routes');
    console.log('=================================\n');
    
    // Load database connection AFTER initialization
    const dbModule = require('./config/database');
    db = dbModule.db; // Set the outer db variable for shutdown handlers
    
    // Load routes AFTER database connection
    const authRoutes = require('./routes/auth');
    const sessionRoutes = require('./routes/sessions');
    const materialRoutes = require('./routes/materials');
    
    console.log('✓ Routes loaded successfully\n');
    
    // Set up routes
    app.use('/api/auth', authRoutes);
    app.use('/api/sessions', sessionRoutes);
    app.use('/api/materials', materialRoutes);
    
    console.log('✓ Routes registered\n');
    
    // Error handling middleware (MUST be after routes)
    app.use((err, req, res, next) => {
      console.error('Error:', err);
      
      res.status(500).json({ 
        error: 'Server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
      });
    });

    // 404 handler (MUST be last)
    app.use((req, res) => {
      res.status(404).json({ 
        error: 'Not found',
        message: 'The requested resource was not found'
      });
    });
    
    console.log('=================================');
    console.log('🚀 Starting Server');
    console.log('=================================\n');
    
    // Then start the server
    server.listen(PORT, () => {
      console.log('=================================');
      console.log('🚀 Cognitive Coach Backend Server');
      console.log('=================================');
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ API: http://localhost:${PORT}/api`);
      console.log(`✓ WebSocket: ws://localhost:${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('=================================\n');
      
      // Start frame cleanup scheduler after server is running
      startCleanupScheduler();

      // Start uptime tracking and periodic reporting
      uptimeTracker.startPeriodicLogging(5 * 60 * 1000); // Report every 5 minutes
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

// Graceful shutdown
let db = null; // Will be set after database initialization

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    if (db) {
      db.close(() => {
        console.log('Database connection closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, closing server...');
  server.close(() => {
    console.log('Server closed');
    if (db) {
      db.close(() => {
        console.log('Database connection closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

module.exports = { app, server, io };