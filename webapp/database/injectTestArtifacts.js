const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const io = require('socket.io-client');

// Database path
const dbPath = path.join(__dirname, 'studycoach.db');
const db = new sqlite3.Database(dbPath);

// Socket.IO client to emit events
const BACKEND_URL = 'http://localhost:3001';
let socket = null;

// Sample artifacts for testing
const sampleArtifacts = [
  {
    type: 'flashcard',
    title: 'JavaScript Closure',
    content: JSON.stringify({
      front: 'What is a closure in JavaScript?',
      back: 'A closure is a function that has access to variables in its outer (enclosing) lexical scope, even after the outer function has returned.'
    })
  },
  {
    type: 'flashcard',
    title: 'React Hooks',
    content: JSON.stringify({
      front: 'What is the purpose of useEffect hook?',
      back: 'useEffect allows you to perform side effects in function components, such as data fetching, subscriptions, or manually changing the DOM.'
    })
  },
  {
    type: 'multiple_choice',
    title: 'SQL Query',
    content: JSON.stringify({
      stem: 'Which SQL command is used to retrieve data from a database?',
      options: ['INSERT', 'SELECT', 'UPDATE', 'DELETE'],
      correct_answer: 1,
      explanation: 'SELECT is used to query and retrieve data from database tables.'
    })
  },
  {
    type: 'multiple_choice',
    title: 'HTTP Methods',
    content: JSON.stringify({
      stem: 'Which HTTP method is used to update an existing resource?',
      options: ['GET', 'POST', 'PUT', 'DELETE'],
      correct_answer: 2,
      explanation: 'PUT is typically used to update an existing resource completely.'
    })
  },
  {
    type: 'equation',
    title: 'Pythagorean Theorem',
    content: JSON.stringify({
      title: 'Pythagorean Theorem',
      equation: 'a^2 + b^2 = c^2',
      description: 'In a right triangle, the square of the hypotenuse equals the sum of squares of the other two sides.'
    })
  },
  {
    type: 'equation',
    title: 'Quadratic Formula',
    content: JSON.stringify({
      title: 'Quadratic Formula',
      equation: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
      description: 'Formula to solve quadratic equations of the form ax² + bx + c = 0'
    })
  },
  {
    type: 'insights',
    title: 'Study Session Insight',
    content: JSON.stringify({
      insight: 'You\'ve been studying for 45 minutes with good focus. Consider taking a 5-minute break.',
      category: 'productivity',
      timestamp: new Date().toISOString()
    })
  },
  {
    type: 'flashcard',
    title: 'Time Complexity',
    content: JSON.stringify({
      front: 'What is the time complexity of binary search?',
      back: 'O(log n) - Binary search divides the search space in half with each comparison.'
    })
  },
  {
    type: 'equation',
    title: 'Einstein\'s Mass-Energy Equivalence',
    content: JSON.stringify({
      title: 'Mass-Energy Equivalence',
      equation: 'E = mc^2',
      description: 'Energy equals mass times the speed of light squared.'
    })
  },
  {
    type: 'multiple_choice',
    title: 'Data Structures',
    content: JSON.stringify({
      stem: 'Which data structure uses LIFO (Last In First Out) principle?',
      options: ['Queue', 'Stack', 'Array', 'Linked List'],
      correct_answer: 1,
      explanation: 'A stack follows the LIFO principle where the last element added is the first one to be removed.'
    })
  }
];

// Function to get the most recent active or paused session
function getCurrentSession() {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id, title, status, user_id 
       FROM sessions 
       WHERE status IN ('active', 'paused')
       ORDER BY created_at DESC 
       LIMIT 1`,
      (err, session) => {
        if (err) {
          reject(err);
        } else {
          resolve(session);
        }
      }
    );
  });
}

// Function to insert artifacts
function insertArtifacts(sessionId, artifacts) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      'INSERT INTO study_artifacts (session_id, type, title, content) VALUES (?, ?, ?, ?)'
    );

    let completed = 0;
    let errors = [];
    const insertedIds = [];

    artifacts.forEach((artifact, index) => {
      stmt.run([sessionId, artifact.type, artifact.title, artifact.content], function(err) {
        if (err) {
          errors.push({ index, error: err.message });
        } else {
          insertedIds.push(this.lastID);
        }
        completed++;

        if (completed === artifacts.length) {
          stmt.finalize();
          if (errors.length > 0) {
            reject(errors);
          } else {
            resolve({ count: completed, ids: insertedIds });
          }
        }
      });
    });
  });
}

// Function to get inserted artifacts with their IDs
function getArtifactsByIds(ids) {
  return new Promise((resolve, reject) => {
    const placeholders = ids.map(() => '?').join(',');
    db.all(
      `SELECT * FROM study_artifacts WHERE id IN (${placeholders})`,
      ids,
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

// Function to emit artifacts via Socket.IO
function emitArtifacts(sessionId, artifacts) {
  return new Promise((resolve, reject) => {
    socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('\n🔌 Connected to Socket.IO server');
      
      // Emit each artifact using the inject-artifact event
      artifacts.forEach((artifact) => {
        socket.emit('inject-artifact', artifact);
      });
      
      console.log(`📤 Emitted ${artifacts.length} artifacts to session-${sessionId}`);
      
      // Disconnect after a short delay to ensure events are sent
      setTimeout(() => {
        socket.disconnect();
        resolve();
      }, 500);
    });

    socket.on('connect_error', (error) => {
      console.warn('⚠️  Could not connect to Socket.IO server:', error.message);
      console.log('   Artifacts inserted but frontend may need manual refresh');
      if (socket) socket.disconnect();
      resolve(); // Don't reject, artifacts are already inserted
    });
  });
}

// Main execution
async function main() {
  try {
    console.log('🔍 Looking for current active session...\n');
    
    const session = await getCurrentSession();
    
    if (!session) {
      console.log('❌ No active or paused session found.');
      console.log('💡 Please start a session in the webapp first, then run this script.\n');
      db.close();
      process.exit(1);
    }

    console.log('✅ Found session:');
    console.log(`   ID: ${session.id}`);
    console.log(`   Title: ${session.title}`);
    console.log(`   Status: ${session.status}`);
    console.log(`   User ID: ${session.user_id}\n`);

    console.log(`📝 Injecting ${sampleArtifacts.length} test artifacts...\n`);

    const result = await insertArtifacts(session.id, sampleArtifacts);

    console.log(`✅ Successfully inserted ${result.count} artifacts!\n`);
    
    // Get the full artifact data to emit via Socket.IO
    const insertedArtifacts = await getArtifactsByIds(result.ids);
    
    // Emit artifacts via Socket.IO for real-time updates
    await emitArtifacts(session.id, insertedArtifacts);
    
    console.log('📊 Artifact breakdown:');
    
    const typeCounts = sampleArtifacts.reduce((acc, artifact) => {
      acc[artifact.type] = (acc[artifact.type] || 0) + 1;
      return acc;
    }, {});

    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });

    console.log('\n✨ Done! Artifacts should appear in the webapp immediately.\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    db.close();
  }
}

// Run the script
main();
