const { getOne, getAll, runQuery } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

// Get all sessions for logged-in user
const getAllSessions = async (req, res) => {
  try {
    const userId = req.session.userId;

    const sessions = await getAll(
      `SELECT * FROM sessions 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ sessions });

  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Could not retrieve sessions'
    });
  }
};

// Get single session by ID
const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    const session = await getOne(
      'SELECT * FROM sessions WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!session) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Session not found'
      });
    }

    res.json({ session });

  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Could not retrieve session'
    });
  }
};

// Create new session
const createSession = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { title } = req.body;

    const result = await runQuery(
      `INSERT INTO sessions (user_id, title, start_time, status) 
       VALUES (?, ?, datetime('now'), 'active')`,
      [userId, title || 'Untitled Session']
    );

    const newSession = await getOne('SELECT * FROM sessions WHERE id = ?', [result.id]);

    // Emit socket event for new session
    if (req.app.get('io')) {
      req.app.get('io').emit('session-created', { session: newSession });
    }

    res.status(201).json({ 
      session: newSession,
      message: 'Session created successfully'
    });

  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Could not create session'
    });
  }
};

// Update session (pause/resume/stop)
const updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;
    const updates = req.body;

    // Verify session belongs to user
    const session = await getOne(
      'SELECT * FROM sessions WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!session) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Session not found'
      });
    }

    // Build update query
    const allowedFields = ['status', 'title', 'end_time', 'duration', 'focus_score', 'attention_score', 'materials_count'];
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
      `UPDATE sessions SET ${setStatements.join(', ')} WHERE id = ?`,
      values
    );

    const updatedSession = await getOne('SELECT * FROM sessions WHERE id = ?', [id]);

    // Emit socket event for session update
    if (req.app.get('io')) {
      req.app.get('io').to(`session-${id}`).emit('session-updated', { 
        sessionId: id,
        updates: updatedSession 
      });
    }

    res.json({ 
      session: updatedSession,
      message: 'Session updated successfully'
    });

  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Could not update session'
    });
  }
};

// Delete session
const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    // Verify session belongs to user
    const session = await getOne(
      'SELECT * FROM sessions WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!session) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Session not found'
      });
    }

    // Delete associated frames
    const frames = await getAll('SELECT file_path FROM captured_frames WHERE session_id = ?', [id]);
    
    for (const frame of frames) {
      try {
        await fs.unlink(frame.file_path);
      } catch (err) {
        console.error(`Could not delete frame file: ${frame.file_path}`, err);
      }
    }

    // Delete from database (cascade will delete frames and materials)
    await runQuery('DELETE FROM sessions WHERE id = ?', [id]);

    res.json({ message: 'Session deleted successfully' });

  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Could not delete session'
    });
  }
};

// Upload captured frame
const uploadFrame = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const userId = req.session.userId;
    const frameType = req.body.type; // 'webcam' or 'screen'

    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file',
        message: 'No frame file uploaded'
      });
    }

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

    // Save frame record to database
    await runQuery(
      `INSERT INTO captured_frames (session_id, frame_type, file_path) 
       VALUES (?, ?, ?)`,
      [sessionId, frameType, req.file.path]
    );

    res.json({ 
      message: 'Frame uploaded successfully',
      file: {
        path: req.file.path,
        type: frameType,
        size: req.file.size
      }
    });

  } catch (error) {
    console.error('Upload frame error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Could not upload frame'
    });
  }
};

module.exports = {
  getAllSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  uploadFrame
};