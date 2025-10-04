const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'studycoach.db');
const db = new sqlite3.Database(dbPath);

console.log('Creating test user...\n');

bcrypt.hash('password', 10, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    process.exit(1);
  }

  db.run(
    `INSERT INTO users (email, password_hash, initials) VALUES (?, ?, ?)`,
    ['test@example.com', hash, 'JD'],
    function(err) {
      if (err) {
        console.error('Error inserting user:', err);
        console.log('User might already exist. Trying to update instead...');
        
        // Try updating instead
        db.run(
          'UPDATE users SET password_hash = ?, initials = ? WHERE email = ?',
          [hash, 'JD', 'test@example.com'],
          (err) => {
            if (err) {
              console.error('Error updating user:', err);
            } else {
              console.log('✓ Test user updated successfully');
            }
            db.close();
          }
        );
      } else {
        console.log('✓ Test user created successfully');
        console.log('  Email: test@example.com');
        console.log('  Password: password');
        console.log('  Initials: JD\n');
        db.close();
      }
    }
  );
});