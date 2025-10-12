const bcrypt = require('bcrypt');
const { getOne, runQuery } = require('../config/database');
const logger = require('../utils/logger');

// Login
const login = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await getOne('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Compare password with hash
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Create session
    req.session.userId = user.id;
    req.session.email = user.email;

    // Calculate duration and log SPEC-8
    const duration = Date.now() - startTime;
    const passed = duration <= 400;
    
    logger.logSpec('SPEC-8', {
      action: 'LOGIN',
      details: {
        User: email,
        Status: 'SUCCESS'
      }
    }, passed, duration);

    // Return user info (without password hash)
    res.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        created_at: user.created_at
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    
    // Log failed login
    const duration = Date.now() - startTime;
    logger.logSpec('SPEC-8', {
      action: 'LOGIN',
      details: {
        User: req.body.email || 'unknown',
        Status: 'ERROR',
        Error: error.message
      }
    }, false, duration);
    
    res.status(500).json({ 
      error: 'Server error',
      message: 'An error occurred during login'
    });
  }
};

// Logout
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ 
        error: 'Logout failed',
        message: 'Could not complete logout'
      });
    }
    res.clearCookie(process.env.SESSION_NAME || 'cognitive_coach_session');
    res.json({ message: 'Logout successful' });
  });
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ 
        error: 'Not authenticated',
        message: 'No active session'
      });
    }

    const user = await getOne('SELECT id, email, first_name, last_name, created_at FROM users WHERE id = ?', [req.session.userId]);

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'Session user does not exist'
      });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Could not retrieve user information'
    });
  }
};

// Register new user
const register = async (req, res) => {
  try {
    const { email, password, first_name, last_name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Missing information',
        message: 'Email and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await getOne('SELECT id FROM users WHERE email = ?', [email]);
    
    if (existingUser) {
      return res.status(409).json({ 
        error: 'User exists',
        message: 'An account with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const result = await runQuery(
      'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
      [email, password_hash, first_name || null, last_name || null]
    );

    // Create session
    req.session.userId = result.id;
    req.session.email = email;

    res.status(201).json({
      user: {
        id: result.id,
        email: email,
        first_name: first_name || null,
        last_name: last_name || null
      },
      message: 'Registration successful'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'An error occurred during registration'
    });
  }
};

module.exports = {
  login,
  logout,
  getCurrentUser,
  register
};