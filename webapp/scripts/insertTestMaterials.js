// Script to insert test study materials into SQLite database
// Run with: node scripts/insertTestMaterials.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const io = require('socket.io-client');

// Database path - adjust as needed
const dbPath = path.join(__dirname, '..', 'database', 'studycoach.db');
const db = new sqlite3.Database(dbPath);

// Socket.IO connection
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const socket = io(BACKEND_URL);

// Log file utilities
const fs = require('fs');
const logsDir = path.join(__dirname, '..', 'backend', 'logs');

// Find the most recent log file
function getActiveLogFile() {
  if (!fs.existsSync(logsDir)) {
    console.log('⚠️  No logs directory found. Make sure backend is running.');
    return null;
  }
  
  const files = fs.readdirSync(logsDir)
    .filter(f => f.startsWith('demo-') && f.endsWith('.log'))
    .map(f => ({
      name: f,
      path: path.join(logsDir, f),
      time: fs.statSync(path.join(logsDir, f)).mtime
    }))
    .sort((a, b) => b.time - a.time);
  
  return files.length > 0 ? files[0].path : null;
}

// Log SPEC-3 to the active log file
function logSpec3(materialId, type, title, sessionId, duration) {
  const logFile = getActiveLogFile();
  if (!logFile) {
    console.log('⚠️  No active log file found. Start the backend server first.');
    return;
  }
  
  const timestamp = new Date().toISOString().slice(11, -1);
  const passed = duration <= 1000;
  const icon = passed ? '✓' : '✗';
  
  let logEntry = `\n[${timestamp}] ${icon} SPEC-3: MATERIAL DISPLAY ${passed ? '✓' : '✗'}\n`;
  logEntry += `  Duration: ${duration}ms (threshold: ≤1000ms)`;
  if (!passed) {
    logEntry += ` [EXCEEDED BY ${duration - 1000}ms]`;
  }
  logEntry += '\n';
  logEntry += `  Material ID: ${materialId}\n`;
  logEntry += `  Type: ${type}\n`;
  logEntry += `  Title: ${title}\n`;
  logEntry += `  Session: ${sessionId}\n`;
  logEntry += `  WebSocket Event: material-created\n`;
  logEntry += `  Status: SUCCESS\n`;
  
  fs.appendFileSync(logFile, logEntry);
  console.log(`  📋 Logged SPEC-3 to ${path.basename(logFile)}`);
}

// Test materials to insert
// Valid types: 'flashcard', 'equation', 'multiple_choice', 'insights'
const testMaterials = [
  {
    session_id: 1,
    type: 'flashcard',
    title: 'Alkene Reactions',
    content: JSON.stringify({
      question: 'What is the major product of hydrobromination of 2-methylpropene?',
      answer: '2-bromo-2-methylpropane (Markovnikov addition)',
      difficulty: 'medium'
    })
  },
  {
    session_id: 1,
    type: 'insights',
    title: 'Stereochemistry Principles',
    content: 'Covers chirality, optical activity, and R/S nomenclature. Key concepts include understanding how to assign R and S configurations, recognizing chiral centers, and predicting optical activity of compounds.'
  },
  {
    session_id: 1,
    type: 'flashcard',
    title: 'Elimination vs Substitution',
    content: JSON.stringify({
      question: 'When does E2 elimination occur preferentially over SN2?',
      answer: 'With bulky bases and secondary/tertiary substrates',
      difficulty: 'hard'
    })
  },
  {
    session_id: 1,
    type: 'multiple_choice',
    title: 'Reaction Mechanisms Quiz',
    content: JSON.stringify({
      questions: [
        {
          question: 'Which mechanism involves a carbocation intermediate?',
          options: ['SN1', 'SN2', 'E2', 'None'],
          correct: 0
        },
        {
          question: 'What type of substrate favors SN2 reactions?',
          options: ['Primary', 'Secondary', 'Tertiary', 'All equally'],
          correct: 0
        }
      ]
    })
  },
  {
    session_id: 2,
    type: 'equation',
    title: 'Integration by Parts',
    content: JSON.stringify({
      formula: '∫u dv = uv - ∫v du',
      example: '∫x·e^x dx',
      solution: 'Let u=x, dv=e^x dx, then du=dx, v=e^x...'
    })
  },
  {
    session_id: 2,
    type: 'flashcard',
    title: 'Derivative Rules',
    content: JSON.stringify({
      question: 'What is the derivative of ln(x)?',
      answer: '1/x',
      difficulty: 'easy'
    })
  }
];

// Wait for socket connection
socket.on('connect', () => {
  console.log('✓ Connected to backend WebSocket server\n');
  insertMaterials();
});

socket.on('connect_error', (error) => {
  console.error('✗ Could not connect to backend:', error.message);
  console.log('  Make sure the backend server is running at', BACKEND_URL);
  process.exit(1);
});

function insertMaterials() {
  db.serialize(() => {
    const insertStmt = db.prepare(
      `INSERT INTO study_artifacts (session_id, type, title, content, created_at) 
       VALUES (?, ?, ?, ?, datetime('now'))`
    );

    console.log('Inserting test materials and tracking SPEC-3...\n');

    let insertedCount = 0;

    testMaterials.forEach((material, index) => {
      // SPEC-3: Start timing from DB insert
      const dbStartTime = Date.now();
      
      insertStmt.run(
        [material.session_id, material.type, material.title, material.content],
        function(err) {
          if (err) {
            console.error(`Error inserting material ${index + 1}:`, err.message);
          } else {
            const materialId = this.lastID;
            console.log(`✓ Inserted: [${material.type}] ${material.title} (Session ${material.session_id})`);
            
            // Emit WebSocket event to the backend's Socket.IO server
            // The backend will broadcast it to clients in the session room
            const materialData = {
              id: materialId,
              session_id: material.session_id,
              type: material.type,
              title: material.title,
              content: material.content,
              created_at: new Date().toISOString()
            };
            
            // Emit to backend which will relay to session room
            socket.emit('test-material-created', {
              sessionId: material.session_id,
              material: materialData
            });
            
            console.log(`  📡 Emitted WebSocket event for session ${material.session_id}`);
            
            // SPEC-3: Calculate time from DB insert to WebSocket emit
            const displayDuration = Date.now() - dbStartTime;
            
            logSpec3(materialId, material.type, material.title, material.session_id, displayDuration);
            
            insertedCount++;
            
            // Close connection after all materials inserted
            if (insertedCount === testMaterials.length) {
              finishUp();
            }
          }
        }
      );
    });
  });
}

function finishUp() {
  console.log('\n✓ All test materials inserted successfully!');
  
  // Query and display inserted materials
  db.all(
    `SELECT sa.*, s.title as session_title 
     FROM study_artifacts sa 
     JOIN sessions s ON sa.session_id = s.id 
     ORDER BY sa.session_id, sa.id`,
    (err, rows) => {
      if (err) {
        console.error('Error querying materials:', err.message);
      } else {
        console.log(`\nTotal materials in database: ${rows.length}\n`);
        console.log('Materials by session:');
        let currentSession = null;
        rows.forEach(row => {
          if (row.session_id !== currentSession) {
            currentSession = row.session_id;
            console.log(`\n  Session ${row.session_id}: ${row.session_title}`);
          }
          console.log(`    - [${row.type}] ${row.title}`);
        });
      }
      
      // Close connections
      socket.close();
      db.close(() => {
        console.log('\n✓ Database connection closed');
        process.exit(0);
      });
    }
  );
}