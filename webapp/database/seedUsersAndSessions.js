const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'studycoach.db');
const db = new sqlite3.Database(dbPath);

console.log('Seeding users and sessions...\n');

// Helper to run async database operations
const runAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
};

const getAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

async function seedData() {
  try {
    // 1. Create or update test user
    console.log('📝 Creating test user...');
    const hashedPassword = await bcrypt.hash('password', 10);
    
    // Check if user exists
    const existingUser = await getAsync(
      'SELECT id FROM users WHERE email = ?',
      ['test@example.com']
    );
    
    let userId;
    if (existingUser) {
      userId = existingUser.id;
      await runAsync(
        'UPDATE users SET password_hash = ?, first_name = ?, last_name = ? WHERE email = ?',
        [hashedPassword, 'Test', 'User', 'test@example.com']
      );
      console.log('✓ Test user updated (ID: ' + userId + ')');
    } else {
      userId = await runAsync(
        'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
        ['test@example.com', hashedPassword, 'Test', 'User']
      );
      console.log('✓ Test user created (ID: ' + userId + ')');
    }

    // 2. Insert sessions
    console.log('\n📚 Creating sessions...');
    
    const sessions = [
      {
        title: 'Organic Chemistry Review',
        start_time: '2024-10-29 14:30:00',
        end_time: '2024-10-29 16:45:00',
        duration: 8100, // 2h 15m in seconds
        status: 'completed',
        focus_score: 88
      },
      {
        title: 'Calculus Problem Solving',
        start_time: '2024-10-28 19:45:00',
        end_time: '2024-10-28 21:30:00',
        duration: 6300, // 1h 45m in seconds
        status: 'completed',
        focus_score: 92
      },
      {
        title: 'World History Reading',
        start_time: '2024-10-27 15:15:00',
        end_time: '2024-10-27 18:35:00',
        duration: 12000, // 3h 20m in seconds
        status: 'completed',
        focus_score: 76
      },
      {
        title: 'Physics Lab Analysis',
        start_time: '2024-10-26 13:00:00',
        end_time: '2024-10-26 15:50:00',
        duration: 10200, // 2h 50m in seconds
        status: 'completed',
        focus_score: 94
      }
    ];

    const sessionIds = [];
    for (const session of sessions) {
      const sessionId = await runAsync(
        `INSERT INTO sessions (user_id, title, start_time, end_time, duration, status, focus_score, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [userId, session.title, session.start_time, session.end_time, session.duration, session.status, session.focus_score]
      );
      sessionIds.push(sessionId);
      console.log(`✓ Created session: "${session.title}" (ID: ${sessionId})`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ SEED COMPLETE');
    console.log('='.repeat(50));
    console.log(`\nCreated:`);
    console.log(`  - 1 user (test@example.com)`);
    console.log(`  - ${sessions.length} sessions`);
    console.log(`\nSession IDs: ${sessionIds.join(', ')}`);
    console.log('\nNext: Run seedArtifacts.js to add study artifacts\n');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

seedData();