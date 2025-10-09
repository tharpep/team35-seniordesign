const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getMaterialsBySession,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial
} = require('../controllers/materialController');

// All routes require authentication
router.use(requireAuth);

// GET /api/sessions/:sessionId/materials - Get all materials for a session
router.get('/sessions/:sessionId/materials', getMaterialsBySession);

// POST /api/materials - Create new material (for testing/manual insertion)
router.post('/', createMaterial);

// GET /api/materials/:id - Get material by ID
router.get('/:id', getMaterialById);

// PUT /api/materials/:id - Update material
router.put('/:id', updateMaterial);

// DELETE /api/materials/:id - Delete material
router.delete('/:id', deleteMaterial);

module.exports = router;