const { getOne, getAll, runQuery } = require('../config/database');

// Get all materials for a session
const getMaterialsBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.session.userId;

    // Verify session belongs to user
    const session = await getOne(
      'SELECT * FROM sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    );

    if (!session) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Session not found'
      });
    }

    const materials = await getAll(
      `SELECT * FROM study_materials 
       WHERE session_id = ? 
       ORDER BY created_at DESC`,
      [sessionId]
    );

    res.json({ materials });

  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Could not retrieve materials'
    });
  }
};

// Get single material by ID
const getMaterialById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    const material = await getOne(
      `SELECT sm.* FROM study_materials sm
       JOIN sessions s ON sm.session_id = s.id
       WHERE sm.id = ? AND s.user_id = ?`,
      [id, userId]
    );

    if (!material) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Material not found'
      });
    }

    res.json({ material });

  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Could not retrieve material'
    });
  }
};

// Create new material (for testing/manual insertion)
const createMaterial = async (req, res) => {
  try {
    const { session_id, type, title, content } = req.body;
    const userId = req.session.userId;

    if (!session_id || !type || !title || !content) {
      return res.status(400).json({ 
        error: 'Missing fields',
        message: 'session_id, type, title, and content are required'
      });
    }

    // Verify session belongs to user
    const session = await getOne(
      'SELECT * FROM sessions WHERE id = ? AND user_id = ?',
      [session_id, userId]
    );

    if (!session) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Session not found'
      });
    }

    // Insert material
    const result = await runQuery(
      `INSERT INTO study_materials (session_id, type, title, content) 
       VALUES (?, ?, ?, ?)`,
      [session_id, type, title, content]
    );

    const newMaterial = await getOne('SELECT * FROM study_materials WHERE id = ?', [result.id]);

    // Update session materials count
    await runQuery(
      `UPDATE sessions 
       SET materials_count = (SELECT COUNT(*) FROM study_materials WHERE session_id = ?) 
       WHERE id = ?`,
      [session_id, session_id]
    );

    // Emit socket event for new material
    if (req.app.get('io')) {
      req.app.get('io').to(`session-${session_id}`).emit('material-created', newMaterial);
      console.log(`[WebSocket] Emitted material-created for session ${session_id}`);
    }

    res.status(201).json({ 
      material: newMaterial,
      message: 'Material created successfully'
    });

  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Could not create material'
    });
  }
};

// Update material
const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;
    const updates = req.body;

    // Verify material belongs to user's session
    const material = await getOne(
      `SELECT sm.* FROM study_materials sm
       JOIN sessions s ON sm.session_id = s.id
       WHERE sm.id = ? AND s.user_id = ?`,
      [id, userId]
    );

    if (!material) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Material not found'
      });
    }

    // Build update query
    const allowedFields = ['type', 'title', 'content'];
    const setStatements = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setStatements.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (setStatements.length === 0) {
      return res.status(400).json({ 
        error: 'Bad request',
        message: 'No valid fields to update'
      });
    }

    values.push(id);

    await runQuery(
      `UPDATE study_materials SET ${setStatements.join(', ')} WHERE id = ?`,
      values
    );

    const updatedMaterial = await getOne('SELECT * FROM study_materials WHERE id = ?', [id]);

    res.json({ 
      material: updatedMaterial,
      message: 'Material updated successfully'
    });

  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Could not update material'
    });
  }
};

// Delete material
const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    // Verify material belongs to user's session
    const material = await getOne(
      `SELECT sm.*, s.id as session_id FROM study_materials sm
       JOIN sessions s ON sm.session_id = s.id
       WHERE sm.id = ? AND s.user_id = ?`,
      [id, userId]
    );

    if (!material) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Material not found'
      });
    }

    await runQuery('DELETE FROM study_materials WHERE id = ?', [id]);

    // Update session materials count
    await runQuery(
      `UPDATE sessions 
       SET materials_count = (SELECT COUNT(*) FROM study_materials WHERE session_id = ?) 
       WHERE id = ?`,
      [material.session_id, material.session_id]
    );

    res.json({ message: 'Material deleted successfully' });

  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Could not delete material'
    });
  }
};

module.exports = {
  getMaterialsBySession,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial
};