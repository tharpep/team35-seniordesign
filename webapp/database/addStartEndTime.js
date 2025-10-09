const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'studycoach.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding start_time and end_time columns to sessions table...\n');

db.serialize(() => {
  // Add start_time column
  db.run(
    `ALTER TABLE sessions ADD COLUMN start_time DATETIME`,
    (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding start_time:', err);
      } else {
        console.log('✓ Added start_time column');
      }
    }
  );

  // Add end_time column
  db.run(
    `ALTER TABLE sessions ADD COLUMN end_time DATETIME`,
    (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding end_time:', err);
      } else {
        console.log('✓ Added end_time column');
        db.close();
      }
    }
  );
});