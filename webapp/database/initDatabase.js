const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Read schema file
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Create database
const dbPath = path.join(__dirname, 'studycoach.db');
const db = new sqlite3.Database(dbPath);

// Execute schema
db.exec(schema, (err) => {
  if (err) {
    console.error('Error creating database:', err);
    process.exit(1);
  }
  
  console.log('✓ Database created successfully at:', dbPath);
  console.log('✓ Tables created: users, sessions, captured_frames, study_materials');
  console.log('✓ Test user created: test@example.com');
  
  db.close();
});