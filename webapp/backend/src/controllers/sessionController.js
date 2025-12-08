const { getOne, getAll, runQuery } = require('../config/database');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const http = require('http');
const facialProcessing = require('../services/facialProcessing');
const ocrQueue = require('../services/ocrQueue');

// Get all sessions for logged-in user with artifact counts
const getAllSessions = async (req, res) => {
  try {
    const userId = req.session.userId;

    const sessions = await getAll(
      `SELECT * FROM sessions
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    // Get artifact counts for each session
    const sessionsWithCounts = await Promise.all(
      sessions.map(async (session) => {
        const counts = await getAll(
          `SELECT type, COUNT(*) as count
           FROM study_artifacts
           WHERE session_id = ?
           GROUP BY type`,
          [session.id]
        );

        // Transform counts into object
        const artifactCounts = {
          flashcard: 0,
          equation: 0,
          multiple_choice: 0,
          insights: 0
        };

        counts.forEach(row => {
          artifactCounts[row.type] = row.count;
        });

        // Calculate total
        const total = Object.values(artifactCounts).reduce((sum, count) => sum + count, 0);

        return {
          ...session,
          artifact_counts: artifactCounts,
          total_artifacts: total
        };
      })
    );

    res.json({ sessions: sessionsWithCounts });

  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Could not retrieve sessions'
    });
  }
};

// Get incomplete session (active or paused) for current user
const getIncompleteSession = async (req, res) => {
  try {
    const userId = req.session.userId;

    console.log('[getIncompleteSession] Fetching for user:', userId);

    const session = await getOne(
      `SELECT * FROM sessions
       WHERE user_id = ? AND status IN ('active', 'paused')
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    console.log('[getIncompleteSession] Found session:', session);

    if (!session) {
      console.log('[getIncompleteSession] No incomplete session found');
      return res.json({ session: null });
    }

    // Get artifact count for this session
    const artifacts = await getAll(
      'SELECT * FROM study_artifacts WHERE session_id = ?',
      [session.id]
    );

    console.log('[getIncompleteSession] Artifact count:', artifacts.length);

    res.json({
      session: {
        ...session,
        artifact_count: artifacts.length
      }
    });

  } catch (error) {
    console.error('Get incomplete session error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Could not retrieve incomplete session'
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

    // First, mark any existing incomplete sessions as completed
    await runQuery(
      `UPDATE sessions
       SET status = 'completed'
       WHERE user_id = ? AND status IN ('active', 'paused')`,
      [userId]
    );

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
    const allowedFields = ['status', 'title', 'end_time', 'duration', 'focus_score'];
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

    // Delete session markdown files and directory
    const genAiBasePath = path.join(__dirname, '../../../gen-ai/src/data/documents/sessions');
    const sessionDir = path.join(genAiBasePath, id.toString());

    try {
      if (fsSync.existsSync(sessionDir)) {
        await fs.rm(sessionDir, { recursive: true, force: true });
        console.log(`[deleteSession] Deleted session directory: ${sessionDir}`);
      }
    } catch (dirError) {
      console.error(`[deleteSession] Error deleting session directory: ${dirError.message}`);
    }

    // Delete Qdrant collection via Gen-AI API (fire-and-forget)
    try {
      const genAiUrl = process.env.GEN_AI_URL || 'http://127.0.0.1:8000';

      const reqOptions = {
        hostname: genAiUrl.replace(/^https?:\/\//, '').split(':')[0] || '127.0.0.1',
        port: genAiUrl.includes(':8000') ? 8000 : (genAiUrl.match(/:(\d+)/)?.[1] || 8000),
        path: `/api/ingest/session/${id}`,
        method: 'DELETE'
      };

      const deleteReq = http.request(reqOptions, (deleteRes) => {
        deleteRes.on('end', () => {
          if (deleteRes.statusCode === 200 || deleteRes.statusCode === 404) {
            console.log(`[deleteSession] Collection deleted for session ${id}`);
          } else {
            console.warn(`[deleteSession] Collection deletion returned ${deleteRes.statusCode}`);
          }
        });
      });

      deleteReq.on('error', (err) => {
        console.error(`[deleteSession] Failed to delete collection: ${err.message}`);
      });

      deleteReq.end();
    } catch (apiError) {
      console.error(`[deleteSession] Error calling Gen-AI API: ${apiError.message}`);
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

// Upload captured frame and process through facial API
const uploadFrame = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const userId = req.session.userId;
    const frameType = req.body.type
      || req.resolvedFrameType
      || req.headers['x-frame-type']
      || req.query?.type
      || req.file?.originalname?.split('_')?.[0]
      || 'unknown';

    console.log(`📸 Upload frame request - Session: ${sessionId}, Type: ${frameType}, File: ${req.file ? 'present' : 'missing'}`);

    if (!req.file) {
      console.error('❌ No file in request');
      return res.status(400).json({
        error: 'No file',
        message: 'No frame file uploaded'
      });
    }

    // Validate frame type
    const validTypes = ['webcam', 'screen', 'external'];
    if (!validTypes.includes(frameType)) {
      console.error(`❌ Invalid frame type: ${frameType}`);
      return res.status(400).json({
        error: 'Invalid type',
        message: `Frame type must be one of: ${validTypes.join(', ')}`
      });
    }

    // Verify session belongs to user
    const session = await getOne(
      'SELECT * FROM sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    );

    if (!session) {
      console.error(`❌ Session ${sessionId} not found for user ${userId}`);
      return res.status(404).json({
        error: 'Not found',
        message: 'Session not found'
      });
    }

    console.log(`✓ Saving frame to database - Path: ${req.file.path}`);

    // Save frame record to database
    await runQuery(
      `INSERT INTO captured_frames (session_id, frame_type, file_path)
       VALUES (?, ?, ?)`,
      [sessionId, frameType, req.file.path]
    );

    console.log(`✓ Frame uploaded successfully - Type: ${frameType}, Size: ${req.file.size} bytes`);

    // Process webcam frames through facial processing API
    let processingResult = null;
    let fatigueEvent = null;
    let distractionEvent = null;

    if (frameType === 'webcam') {
      try {
        console.log(`🔍 Processing frame through facial API...`);
        processingResult = await facialProcessing.processFrame(req.file.path, sessionId);

        if (processingResult && processingResult.success) {
          // Store metrics in database
          await facialProcessing.storeMetrics(sessionId, processingResult);
          console.log(`✓ Facial metrics stored - Focus: ${processingResult.result?.focus_score?.toFixed(2)}, Emotion: ${processingResult.result?.emotion}`);

          // Check for fatigue and distraction events
          fatigueEvent = await facialProcessing.checkFatigue(sessionId, processingResult);
          distractionEvent = await facialProcessing.checkDistraction(sessionId, processingResult);

          // Broadcast metrics to frontend via Socket.IO
          const io = req.app.get('io');
          if (io) {
            const metricsPayload = {
              sessionId: parseInt(sessionId),
              timestamp: new Date().toISOString(),
              metrics: processingResult.result,
              fatigueEvent,
              distractionEvent
            };

            io.to(`session-${sessionId}`).emit('facial-metrics', metricsPayload);
            console.log(`📡 Broadcasted facial metrics to session-${sessionId}`);
          }
        } else {
          console.warn(`⚠️ Facial processing returned unsuccessful: ${processingResult?.error}`);
        }
      } catch (processingError) {
        // Log but don't fail the request if facial processing fails
        console.warn(`⚠️ Facial processing error (non-fatal): ${processingError.message}`);
      }
    } else if (frameType === 'screen' || frameType === 'external') {
      // Queue screen and external frames for OCR processing
      try {
        console.log(`📝 Queueing ${frameType} frame for OCR processing...`);
        ocrQueue.addToQueue(sessionId, req.file.path, frameType);
        console.log(`✓ Frame queued for OCR`);
      } catch (queueError) {
        // Log but don't fail the request if queuing fails
        console.warn(`⚠️ OCR queue error (non-fatal): ${queueError.message}`);
      }
    }

    res.json({
      message: 'Frame uploaded successfully',
      file: {
        path: req.file.path,
        type: frameType,
        size: req.file.size
      },
      processing: processingResult ? {
        success: processingResult.success,
        focus_score: processingResult.result?.focus_score,
        emotion: processingResult.result?.emotion,
        face_detected: processingResult.result?.face_detected
      } : null,
      events: {
        fatigue: fatigueEvent,
        distraction: distractionEvent
      }
    });

  } catch (error) {
    console.error('❌ Upload frame error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      sessionId: req.params.id,
      frameType: req.body.type,
      hasFile: !!req.file
    });
    res.status(500).json({
      error: 'Server error',
      message: error.message || 'Could not upload frame',
      details: error.message
    });
  }
};

// Get facial metrics for a session
const getSessionMetrics = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
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

    const metrics = await facialProcessing.getSessionMetrics(sessionId);
    const recentMetrics = await facialProcessing.getRecentMetrics(sessionId, 20);
    const timeSeries = await facialProcessing.getFocusTimeSeries(sessionId);

    res.json({
      session_id: sessionId,
      aggregated: metrics,
      recent: recentMetrics,
      timeSeries: timeSeries
    });

  } catch (error) {
    console.error('Get session metrics error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Could not retrieve metrics'
    });
  }
};

// Append markdown context to session
const appendContext = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const userId = req.session.userId;
    const { markdown, source } = req.body;

    console.log(`[appendContext] Session: ${sessionId}, Source: ${source || 'unknown'}, Markdown length: ${markdown?.length || 0}`);

    // Validate input
    if (!markdown || typeof markdown !== 'string') {
      return res.status(400).json({
        error: 'Bad request',
        message: 'markdown field is required and must be a string'
      });
    }

    // Verify session belongs to user
    const session = await getOne(
      'SELECT * FROM sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    );

    if (!session) {
      console.error(`[appendContext] Session ${sessionId} not found for user ${userId}`);
      return res.status(404).json({
        error: 'Not found',
        message: 'Session not found'
      });
    }

    // Write markdown file to session directory for RAG ingestion
    // Note: We no longer store markdown in SQL sessions.context - it goes to file system and vector DB only
    const timestamp = new Date().toISOString();
    const genAiBasePath = path.join(__dirname, '../../../gen-ai/src/data/documents/sessions');
    const sessionDir = path.join(genAiBasePath, sessionId.toString());
    const fileName = `${timestamp.replace(/[:.]/g, '-')}_${source || 'unknown'}.md`;
    const filePath = path.join(sessionDir, fileName);

    try {
      // Ensure session directory exists
      if (!fsSync.existsSync(sessionDir)) {
        fsSync.mkdirSync(sessionDir, { recursive: true });
        console.log(`[appendContext] Created session directory: ${sessionDir}`);
      }

      // Write markdown file
      await fs.writeFile(filePath, markdown, 'utf8');
      console.log(`[appendContext] Wrote markdown file: ${filePath}`);

      // Trigger Gen-AI ingestion (fire-and-forget, don't await)
      const genAiUrl = process.env.GEN_AI_URL || 'http://127.0.0.1:8000';

      // Use relative path from gen-ai directory
      const relativePath = path.relative(
        path.join(__dirname, '../../../gen-ai'),
        filePath
      ).replace(/\\/g, '/'); // Normalize path separators

      const ingestPayload = JSON.stringify({
        session_id: sessionId.toString(),
        file_path: relativePath
      });

      // Fire-and-forget HTTP request
      const reqOptions = {
        hostname: genAiUrl.replace(/^https?:\/\//, '').split(':')[0] || '127.0.0.1',
        port: genAiUrl.includes(':8000') ? 8000 : (genAiUrl.match(/:(\d+)/)?.[1] || 8000),
        path: '/api/ingest/session_file',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(ingestPayload)
        }
      };

      const ingestReq = http.request(reqOptions, (ingestRes) => {
        let data = '';
        ingestRes.on('data', (chunk) => { data += chunk; });
        ingestRes.on('end', () => {
          if (ingestRes.statusCode === 200) {
            console.log(`[appendContext] Ingestion queued successfully for session ${sessionId}`);
          } else {
            console.warn(`[appendContext] Ingestion request returned ${ingestRes.statusCode}: ${data}`);
          }
        });
      });

      ingestReq.on('error', (err) => {
        console.error(`[appendContext] Failed to trigger ingestion: ${err.message}`);
        // Don't fail the request - ingestion can happen later
      });

      ingestReq.write(ingestPayload);
      ingestReq.end();

    } catch (fileError) {
      console.error(`[appendContext] Error writing file or triggering ingestion: ${fileError.message}`);
      // Don't fail the request - ingestion can happen later
    }

    console.log(`✓ Markdown file written and ingestion queued for session ${sessionId}`);

    // Emit socket event for context update
    if (req.app.get('io')) {
      req.app.get('io').to(`session-${sessionId}`).emit('context-updated', {
        sessionId: sessionId,
        source: source || 'unknown'
      });
    }

    res.json({
      message: 'Markdown file written and ingestion queued successfully',
      appended: markdown.length
    });

  } catch (error) {
    console.error('[appendContext] Error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Could not append context'
    });
  }
};

module.exports = {
  getAllSessions,
  getIncompleteSession,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  uploadFrame,
  getSessionMetrics,
  appendContext
};
