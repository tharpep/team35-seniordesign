const express = require('express');
const router = express.Router();
const { login, logout, getCurrentUser, register } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// POST /api/auth/login - Login user
router.post('/login', login);

// POST /api/auth/logout - Logout user
router.post('/logout', logout);

// POST /api/auth/register - Register new user
router.post('/register', register);

// GET /api/auth/me - Get current logged-in user
router.get('/me', requireAuth, getCurrentUser);

module.exports = router;