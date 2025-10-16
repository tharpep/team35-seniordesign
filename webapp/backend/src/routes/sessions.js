const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const {
  getAllSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  uploadFrame
} = require('../controllers/sessionController');

// Configure multer for frame uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sessionId = req.params.id;
    const frameType = req.body.type || 'unknown';
    const uploadDir = path.join(__dirname, '../../../uploads/frames', `session_${sessionId}`, frameType);
    
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadDir, { recursive: true });
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `frame_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

// All routes require authentication
router.use(requireAuth);

// GET /api/sessions - Get all sessions for logged-in user
router.get('/', getAllSessions);

// POST /api/sessions - Create new session
router.post('/', createSession);

// GET /api/sessions/:id - Get session by ID
router.get('/:id', getSessionById);

// PUT /api/sessions/:id - Update session
router.put('/:id', updateSession);

// DELETE /api/sessions/:id - Delete session
router.delete('/:id', deleteSession);

// POST /api/sessions/:id/frames - Upload captured frame
router.post('/:id/frames', upload.single('frame'), uploadFrame);

module.exports = router;