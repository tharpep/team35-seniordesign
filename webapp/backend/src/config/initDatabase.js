const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

/**
 * Run database migrations
 * - Checks for missing columns and adds them
 * - Safe to run multiple times (idempotent)
 */
const runMigrations = (dbPath) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        return reject(new Error(`Failed to connect for migrations: ${err.message}`));
      }
    });

    // Check if context column exists in sessions table
    db.all("PRAGMA table_info(sessions)", (err, rows) => {
      if (err) {
        db.close();
        return reject(new Error(`Failed to check sessions table: ${err.message}`));
      }

      const hasContext = rows.some(row => row.name === 'context');

      if (!hasContext) {
        console.log('⚙️  Running migration: Adding context column to sessions table...');
        db.run("ALTER TABLE sessions ADD COLUMN context TEXT DEFAULT ''", (err) => {
          if (err) {
            console.error('❌ Migration failed:', err.message);
            db.close();
            return reject(err);
          }

          console.log('✓ Migration completed: context column added\n');
          db.close();
          resolve({ migrated: true });
        });
      } else {
        console.log('✓ All migrations up to date\n');
        db.close();
        resolve({ migrated: false });
      }
    });
  });
};

/**
 * Automatic Database Initialization
 * - Checks if database exists AND has tables
 * - Creates schema if database is missing OR tables are missing
 * - Runs migrations to update existing databases
 * - Never touches existing database with tables
 * - Handles race condition where database file exists but tables don't
 * - Returns promise for async/await support
 */
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    // Paths
    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    const dbPath = path.join(__dirname, '../../../database/studycoach.db');

    // Create database connection (will create file if it doesn't exist)
    // This handles the race condition where database.js creates an empty file
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error connecting to database:', err.message);
        return reject(new Error(`Failed to connect to database: ${err.message}`));
      }
    });

    // Check if users table exists (if it exists, all tables should exist)
    // This is more reliable than checking file existence due to race conditions
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
      if (err) {
        db.close();
        return reject(new Error(`Failed to check tables: ${err.message}`));
      }

      // If users table doesn't exist, we need to create all tables
      if (!row) {
        const dbExists = fs.existsSync(dbPath);
        if (dbExists) {
          console.log('⚙️  Database exists but tables are missing, creating tables...\n');
        } else {
          console.log('⚙️  Database not found, creating new database...\n');
        }

        // Read schema
        let schema;
        try {
          schema = fs.readFileSync(schemaPath, 'utf8');
        } catch (err) {
          db.close();
          console.error('❌ Error reading schema file:', err.message);
          return reject(new Error(`Failed to read schema: ${err.message}`));
        }

        // Execute schema
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
      } else {
        // Tables exist, check for migrations
        console.log('✓ Database and tables already exist\n');
        db.close(async (err) => {
          if (err) {
            console.error('❌ Error closing database:', err.message);
            return reject(err);
          }

          try {
            // Run migrations on existing database
            await runMigrations(dbPath);
            resolve({ created: false, message: 'Database already initialized' });
          } catch (migrationError) {
            reject(migrationError);
          }
        });
      }
    });
  });
};

module.exports = { initializeDatabase };
