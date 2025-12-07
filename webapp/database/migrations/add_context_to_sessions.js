/**
 * Migration: Add context field to sessions table
 *
 * This migration adds a 'context' field to store accumulated markdown
 * content from OCR processing (glasses and screen captures).
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../cognitive-coach.db');

async function migrate() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Failed to connect to database:', err);
        reject(err);
        return;
      }

      console.log('Connected to database for migration');

      // Check if context column already exists
      db.all("PRAGMA table_info(sessions)", (err, rows) => {
        if (err) {
          console.error('Failed to get table info:', err);
          db.close();
          reject(err);
          return;
        }

        const hasContext = rows.some(row => row.name === 'context');

        if (hasContext) {
          console.log('✓ Context column already exists, skipping migration');
          db.close();
          resolve();
          return;
        }

        // Add context column
        console.log('Adding context column to sessions table...');
        db.run("ALTER TABLE sessions ADD COLUMN context TEXT DEFAULT ''", (err) => {
          if (err) {
            console.error('Failed to add context column:', err);
            db.close();
            reject(err);
            return;
          }

          console.log('✓ Context column added successfully');
          db.close();
          resolve();
        });
      });
    });
  });
}

// Run migration if called directly
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrate };
