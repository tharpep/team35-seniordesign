const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const {
  getAllSessions,
  getIncompleteSession,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  uploadFrame,
  getSessionMetrics,
  appendContext
} = require('../controllers/sessionController');
const {
  getMaterialsBySession
} = require('../controllers/materialController');

const FRAME_TYPES = new Set(['webcam', 'screen', 'external']);

const resolveFrameType = (req, file) => {
  const candidates = [
    req.body?.type,
    req.headers['x-frame-type'],
    req.query?.type,
    file?.originalname?.split('_')?.[0]
  ];

  const match = candidates.find(value => typeof value === 'string' && FRAME_TYPES.has(value));
  return match || 'unknown';
};

// Configure multer for frame uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sessionId = req.params.id;
    const frameType = resolveFrameType(req, file);
    req.resolvedFrameType = frameType;
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

// GET /api/sessions/incomplete - Get incomplete session (MUST be before /:id routes)
router.get('/incomplete', getIncompleteSession);

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

// GET /api/sessions/:id/metrics - Get facial processing metrics for a session
router.get('/:id/metrics', getSessionMetrics);

// POST /api/sessions/:id/context - Append markdown context to session
router.post('/:id/context', appendContext);

// GET /api/sessions/:sessionId/materials - Get all materials for a session
router.get('/:sessionId/materials', getMaterialsBySession);

module.exports = router;
