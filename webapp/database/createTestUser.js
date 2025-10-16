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
    `INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)`,
    ['test@example.com', hash, 'Test', 'User'],
    function(err) {
      if (err) {
        console.error('Error inserting user:', err);
        console.log('User might already exist. Trying to update instead...\n');
        
        // Try updating instead
        db.run(
          'UPDATE users SET password_hash = ?, first_name = ?, last_name = ? WHERE email = ?',
          [hash, 'Test', 'User', 'test@example.com'],
          (err) => {
            if (err) {
              console.error('Error updating user:', err);
            } else {
              console.log('✓ Test user updated successfully');
              console.log('  Email: test@example.com');
              console.log('  Password: password');
              console.log('  Name: Test User\n');
            }
            db.close();
          }
        );
      } else {
        console.log('✓ Test user created successfully');
        console.log('  Email: test@example.com');
        console.log('  Password: password');
        console.log('  Name: Test User\n');
        db.close();
      }
    }
  );
});