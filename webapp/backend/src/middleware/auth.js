// Authentication middleware to protect routes

const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    // User is authenticated
    next();
  } else {
    // User is not authenticated
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Please log in to access this resource'
    });
  }
};

// Optional auth - adds user info if logged in but doesn't block
const optionalAuth = (req, res, next) => {
  // Just pass through, user info will be in req.session if logged in
  next();
};

// Check if user owns the resource (for sessions, etc.)
const checkOwnership = (resourceUserId) => {
  return (req, res, next) => {
    if (req.session.userId === resourceUserId) {
      next();
    } else {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
    }
  };
};

module.exports = {
  requireAuth,
  optionalAuth,
  checkOwnership
};