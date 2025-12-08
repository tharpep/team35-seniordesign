const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  injectArtifact,
  generateMaterial
} = require('../controllers/materialController');

// Artifact injection endpoint (no auth - for gen-ai service)
// This should be called by the gen-ai Python service
router.post('/inject', injectArtifact);

// All other routes require authentication
router.use(requireAuth);

// NOTE: getMaterialsBySession is now in sessions.js at /api/sessions/:sessionId/materials

// POST /api/materials/generate - Generate artifact via gen-ai and inject into database
router.post('/generate', generateMaterial);

// POST /api/materials - Create new material (for testing/manual insertion)
router.post('/', createMaterial);

// GET /api/materials/:id - Get material by ID
router.get('/:id', getMaterialById);

// PUT /api/materials/:id - Update material
router.put('/:id', updateMaterial);

// DELETE /api/materials/:id - Delete material
router.delete('/:id', deleteMaterial);

module.exports = router;