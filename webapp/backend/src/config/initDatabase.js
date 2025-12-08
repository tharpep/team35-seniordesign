const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

/**
 * Automatic Database Initialization
 * - Checks if database exists
 * - Creates schema if database is missing
 * - Never touches existing database
 * - Returns promise for async/await support
 */
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    // Paths
    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    const dbPath = path.join(__dirname, '../../../database/studycoach.db');
    
    // Check if database already exists
    const dbExists = fs.existsSync(dbPath);
    
    if (dbExists) {
      console.log('✓ Database already exists, skipping initialization');
      return resolve({ created: false, message: 'Database already exists' });
    }
    
    console.log('⚙️  Database not found, creating new database...\n');
    
    // Read schema
    let schema;
    try {
      schema = fs.readFileSync(schemaPath, 'utf8');
    } catch (err) {
      console.error('❌ Error reading schema file:', err.message);
      return reject(new Error(`Failed to read schema: ${err.message}`));
    }
    
    // Create database
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error creating database:', err.message);
        return reject(new Error(`Failed to create database: ${err.message}`));
      }
    });
    
    // Execute schema
    db.serialize(() => {
      db.exec(schema, (err) => {
        if (err) {
          console.error('❌ Error executing schema:', err.message);
          db.close();
          return reject(new Error(`Failed to execute schema: ${err.message}`));
        }
        
        console.log('✓ Database created successfully at:', dbPath);
        console.log('✓ Tables created:');
        console.log('  - users');
        console.log('  - sessions');
        console.log('  - captured_frames');
        console.log('  - study_artifacts');
        console.log('  - facial_metrics');
        console.log('  - session_fatigue_flags');
        console.log('  - session_distraction_events');
        console.log('');
        
        db.close((err) => {
          if (err) {
            console.error('❌ Error closing database:', err.message);
            return reject(err);
          }
          
          resolve({ 
            created: true, 
            message: 'Database initialized successfully',
            path: dbPath 
          });
        });
      });
    });
  });
};

module.exports = { initializeDatabase };