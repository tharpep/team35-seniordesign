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
      `SELECT * FROM study_artifacts 
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
      `SELECT sm.* FROM study_artifacts sm
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
      `INSERT INTO study_artifacts (session_id, type, title, content) 
       VALUES (?, ?, ?, ?)`,
      [session_id, type, title, content]
    );

    const newMaterial = await getOne('SELECT * FROM study_artifacts WHERE id = ?', [result.id]);

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
      `SELECT sm.* FROM study_artifacts sm
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
      `UPDATE study_artifacts SET ${setStatements.join(', ')} WHERE id = ?`,
      values
    );

    const updatedMaterial = await getOne('SELECT * FROM study_artifacts WHERE id = ?', [id]);

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
      `SELECT sm.* FROM study_artifacts sm
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

    await runQuery('DELETE FROM study_artifacts WHERE id = ?', [id]);

    res.json({ message: 'Material deleted successfully' });

  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Could not delete material'
    });
  }
};

// Inject artifact from gen-ai system (no auth required for internal service)
const injectArtifact = async (req, res) => {
  try {
    const { artifact, session_id } = req.body;

    console.log('[Artifact Injection] Received request');
    console.log('[Artifact Injection] Session ID:', session_id);
    console.log('[Artifact Injection] Artifact Type:', artifact?.artifact_type);

    // Validate request
    if (!artifact || !artifact.artifact_type) {
      return res.status(400).json({ 
        error: 'Missing artifact data',
        message: 'artifact object with artifact_type is required'
      });
    }

    let targetSessionId = session_id;

    // If no session_id provided, use the most recent session
    if (!targetSessionId) {
      console.log('[Artifact Injection] No session_id provided, finding most recent session...');
      const recentSession = await getOne(
        'SELECT id FROM sessions ORDER BY created_at DESC, id DESC LIMIT 1'
      );
      
      if (!recentSession) {
        return res.status(404).json({ 
          error: 'No sessions found',
          message: 'No sessions available in database'
        });
      }
      
      targetSessionId = recentSession.id;
      console.log('[Artifact Injection] Using most recent session:', targetSessionId);
    } else {
      // Verify session exists
      const session = await getOne(
        'SELECT * FROM sessions WHERE id = ?',
        [targetSessionId]
      );

      if (!session) {
        return res.status(404).json({ 
          error: 'Session not found',
          message: `Session ${targetSessionId} does not exist`
        });
      }
    }

    // Map artifact_type to database type
    const typeMapping = {
      'flashcards': 'flashcard',
      'mcq': 'multiple_choice',
      'insights': 'insights',
      'equation': 'equation'
    };

    const dbType = typeMapping[artifact.artifact_type] || artifact.artifact_type;

    // Generate title based on artifact type and content
    let title = 'Generated Artifact';
    if (artifact.artifact_type === 'flashcards' && artifact.cards && artifact.cards.length > 0) {
      title = artifact.cards[0].front.substring(0, 100);
    } else if (artifact.artifact_type === 'mcq' && artifact.questions && artifact.questions.length > 0) {
      title = artifact.questions[0].stem.substring(0, 100);
    } else if (artifact.artifact_type === 'insights' && artifact.insights && artifact.insights.length > 0) {
      title = artifact.insights[0].title || artifact.insights[0].takeaway.substring(0, 100);
    }

    // Store entire artifact as JSON string in content field
    const content = JSON.stringify(artifact);

    // Insert into database
    const result = await runQuery(
      `INSERT INTO study_artifacts (session_id, type, title, content) 
       VALUES (?, ?, ?, ?)`,
      [targetSessionId, dbType, title, content]
    );

    const newMaterial = await getOne('SELECT * FROM study_artifacts WHERE id = ?', [result.id]);

    console.log('[Artifact Injection] Successfully inserted artifact:', result.id);

    // Emit socket event for real-time updates
    if (req.app.get('io')) {
      req.app.get('io').to(`session-${targetSessionId}`).emit('material-created', newMaterial);
      console.log(`[Artifact Injection] Emitted material-created event for session ${targetSessionId}`);
    }

    res.status(201).json({ 
      success: true,
      material: newMaterial,
      message: 'Artifact injected successfully'
    });

  } catch (error) {
    console.error('[Artifact Injection] Error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Could not inject artifact',
      details: error.message
    });
  }
};

// Generate artifact via gen-ai and inject into database
const generateMaterial = async (req, res) => {
  try {
    const { type, topic, session_id, num_items } = req.body;
    const userId = req.session.userId;

    // Validate required fields
    if (!type || !session_id) {
      return res.status(400).json({ 
        error: 'Missing fields',
        message: 'type and session_id are required'
      });
    }

    // Validate type
    const validTypes = ['flashcard', 'mcq', 'insights'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid type',
        message: `type must be one of: ${validTypes.join(', ')}`
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

    // Determine topic: use provided topic, or check sessions.context, or let Gen-AI extract it
    let artifactTopic = topic;
    if (!artifactTopic) {
      // Check if we have a stored topic in sessions.context (must be non-empty string)
      const storedTopic = session.context && session.context.trim() ? session.context.trim() : null;
      artifactTopic = storedTopic; // null means Gen-AI will extract it
    }
    const itemCount = num_items || 1;

    // Map type to database type for querying existing artifacts
    const queryTypeMapping = {
      'flashcard': 'flashcard',
      'mcq': 'multiple_choice',
      'insights': 'insights'
    };
    const queryDbType = queryTypeMapping[type] || type;

    // Query existing artifacts of the same type to avoid duplicates
    const existingArtifacts = await getAll(
      `SELECT content FROM study_artifacts 
       WHERE session_id = ? AND type = ? 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [session_id, queryDbType]
    );

    // Extract previews from existing artifacts
    const existingPreviews = [];
    for (const artifact of existingArtifacts) {
      try {
        const content = JSON.parse(artifact.content);
        if (type === 'flashcard' && content.cards && content.cards.length > 0) {
          existingPreviews.push(content.cards[0].front);
        } else if (type === 'mcq' && content.questions && content.questions.length > 0) {
          existingPreviews.push(content.questions[0].stem);
        } else if (type === 'insights' && content.insights && content.insights.length > 0) {
          const insight = content.insights[0];
          existingPreviews.push(insight.title || insight.takeaway);
        }
      } catch (e) {
        // Skip invalid JSON
        console.warn('[Artifact Generation] Failed to parse existing artifact:', e);
      }
    }

    // Log existing artifacts for debugging
    console.log(`[Artifact Generation] Found ${existingPreviews.length} existing ${type} artifacts for session ${session_id}`);
    if (existingPreviews.length > 0) {
      console.log(`[Artifact Generation] Existing artifact previews:`, existingPreviews);
    }

    // Build session context
    const sessionContext = {
      session_id: session.id,
      session_title: session.title || 'Untitled Session',
      existing_artifacts: existingPreviews
    };

    // Map type to gen-ai endpoint
    const endpointMap = {
      'flashcard': '/flashcards',
      'mcq': '/mcq',
      'insights': '/insights'
    };

    const genaiEndpoint = endpointMap[type];
    const genaiUrl = `http://localhost:8000/api${genaiEndpoint}`;

    console.log(`[Artifact Generation] Calling gen-ai: ${genaiUrl}`);
    console.log(`[Artifact Generation] Topic: ${artifactTopic}, Items: ${itemCount}`);
    console.log(`[Artifact Generation] Session Context:`, sessionContext);

    // Call gen-ai API
    const axios = require('axios');
    const genaiResponse = await axios.post(genaiUrl, {
      topic: artifactTopic,
      num_items: itemCount,
      session_context: sessionContext
    }, {
      timeout: 60000 // 60 second timeout for generation
    });

    const artifact = genaiResponse.data;

    // Store extracted topic in sessions.context if it was extracted and context is empty
    if (artifact && artifact.extracted_topic) {
      const hasStoredTopic = session.context && session.context.trim();
      if (!hasStoredTopic) {
        try {
          await runQuery(
            'UPDATE sessions SET context = ? WHERE id = ?',
            [artifact.extracted_topic, session_id]
          );
          console.log(`[Artifact Generation] Stored extracted topic in sessions.context: ${artifact.extracted_topic}`);
        } catch (dbError) {
          console.error(`[Artifact Generation] Failed to store extracted topic: ${dbError.message}`);
          // Don't fail the request - topic storage is secondary
        }
      }
    }

    if (!artifact || !artifact.artifact_type) {
      return res.status(500).json({ 
        error: 'Invalid response',
        message: 'Gen-AI API returned invalid artifact'
      });
    }

    console.log(`[Artifact Generation] Successfully generated ${type} artifact`);

    // Inject artifact into database using existing logic
    const typeMapping = {
      'flashcards': 'flashcard',
      'mcq': 'multiple_choice',
      'insights': 'insights',
      'equation': 'equation'
    };

    const dbType = typeMapping[artifact.artifact_type] || artifact.artifact_type;

    // Generate title based on artifact type and content
    let title = 'Generated Artifact';
    if (artifact.artifact_type === 'flashcards' && artifact.cards && artifact.cards.length > 0) {
      title = artifact.cards[0].front.substring(0, 100);
    } else if (artifact.artifact_type === 'mcq' && artifact.questions && artifact.questions.length > 0) {
      title = artifact.questions[0].stem.substring(0, 100);
    } else if (artifact.artifact_type === 'insights' && artifact.insights && artifact.insights.length > 0) {
      title = artifact.insights[0].title || artifact.insights[0].takeaway.substring(0, 100);
    }

    const content = JSON.stringify(artifact);

    // Insert into database
    const result = await runQuery(
      `INSERT INTO study_artifacts (session_id, type, title, content) 
       VALUES (?, ?, ?, ?)`,
      [session_id, dbType, title, content]
    );

    const newMaterial = await getOne('SELECT * FROM study_artifacts WHERE id = ?', [result.id]);

    console.log(`[Artifact Generation] Successfully injected artifact: ${result.id}`);

    // Emit socket event for real-time updates
    if (req.app.get('io')) {
      req.app.get('io').to(`session-${session_id}`).emit('material-created', newMaterial);
      console.log(`[Artifact Generation] Emitted material-created event for session ${session_id}`);
    }

    res.status(201).json({ 
      success: true,
      material: newMaterial,
      message: 'Artifact generated and stored successfully'
    });

  } catch (error) {
    console.error('[Artifact Generation] Error:', error);
    
    // Provide helpful error messages
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      return res.status(503).json({ 
        error: 'Service unavailable',
        message: 'Gen-AI service is not available. Please ensure the gen-ai API server is running on port 8000.'
      });
    }

    if (error.response?.status) {
      return res.status(error.response.status).json({ 
        error: 'Generation failed',
        message: error.response.data?.detail?.error || error.response.data?.error || 'Failed to generate artifact'
      });
    }

    res.status(500).json({ 
      error: 'Server error',
      message: 'Could not generate artifact',
      details: error.message
    });
  }
};

module.exports = {
  getMaterialsBySession,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  injectArtifact,
  generateMaterial
};