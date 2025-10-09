const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

// Read schema file
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Create database
const dbPath = path.join(__dirname, 'studycoach.db');

// Delete existing database if it exists (fresh start)
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('✓ Deleted existing database\n');
}

const db = new sqlite3.Database(dbPath);

console.log('Creating fresh database...\n');

// Execute schema
db.serialize(() => {
  db.exec(schema, (err) => {
    if (err) {
      console.error('Error creating database:', err);
      process.exit(1);
    }
    
    console.log('✓ Database created successfully at:', dbPath);
    console.log('✓ Tables created:');
    console.log('  - users');
    console.log('  - sessions');
    console.log('  - captured_frames');
    console.log('  - study_artifacts');
    console.log('  - session_fatigue_flags (placeholder)');
    console.log('  - session_distraction_events (placeholder)\n');
    
    // Hash the test user password
    bcrypt.hash('password', 10, (err, hash) => {
      if (err) {
        console.error('Error hashing password:', err);
        process.exit(1);
      }
      
      // Update test user with hashed password
      db.run(
        'UPDATE users SET password_hash = ? WHERE email = ?',
        [hash, 'test@example.com'],
        (err) => {
          if (err) {
            console.error('Error updating password:', err);
            process.exit(1);
          }
          
          console.log('✓ Test user password hashed and updated');
          console.log('\n' + '='.repeat(50));
          console.log('DATABASE READY');
          console.log('='.repeat(50));
          console.log('\nTest Account Credentials:');
          console.log('  Email: test@example.com');
          console.log('  Password: password');
          console.log('  Name: Test User\n');
          
          db.close();
        }
      );
    });
  });
});