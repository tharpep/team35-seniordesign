const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

/**
 * Run database migrations
 * - Checks for missing columns and tables
 * - Adds them if missing
 * - Safe to run multiple times (idempotent)
 */
const runMigrations = (dbPath) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        return reject(new Error(`Failed to connect for migrations: ${err.message}`));
      }
    });

    const migrations = [];

    // Migration 1: Add context column to sessions table
    const checkContextColumn = new Promise((res, rej) => {
      db.all("PRAGMA table_info(sessions)", (err, rows) => {
        if (err) return rej(err);
        const hasContext = rows.some(row => row.name === 'context');
        if (!hasContext) {
          console.log('⚙️  Running migration: Adding context column to sessions table...');
          db.run("ALTER TABLE sessions ADD COLUMN context TEXT DEFAULT ''", (err) => {
            if (err) return rej(err);
            console.log('✓ Migration completed: context column added');
            res({ migrated: true });
          });
        } else {
          res({ migrated: false });
        }
      });
    });

    // Migration 2: Add facial_metrics table if missing
    const checkFacialMetricsTable = new Promise((res, rej) => {
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='facial_metrics'", (err, row) => {
        if (err) return rej(err);
        if (!row) {
          console.log('⚙️  Running migration: Creating facial_metrics table...');
          const createTableSQL = `
            CREATE TABLE facial_metrics (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              session_id INTEGER NOT NULL,
              frame_id TEXT,
              timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
              face_detected INTEGER DEFAULT 0,
              detection_confidence REAL,
              focus_score REAL,
              focus_confidence REAL,
              gaze_horizontal REAL,
              gaze_vertical REAL,
              blink_rate REAL,
              head_yaw REAL,
              head_pitch REAL,
              emotion TEXT,
              emotion_confidence REAL,
              emotion_probabilities TEXT,
              frame_quality REAL,
              lighting_estimate REAL,
              sharpness REAL,
              total_latency_ms REAL,
              quality_warning TEXT,
              low_confidence_warning INTEGER DEFAULT 0,
              FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            );
            CREATE INDEX idx_facial_metrics_session ON facial_metrics(session_id);
            CREATE INDEX idx_facial_metrics_timestamp ON facial_metrics(session_id, timestamp);
          `;
          db.exec(createTableSQL, (err) => {
            if (err) return rej(err);
            console.log('✓ Migration completed: facial_metrics table created');
            res({ migrated: true });
          });
        } else {
          res({ migrated: false });
        }
      });
    });

    // Migration 3: Add session_fatigue_flags table if missing
    const checkFatigueFlagsTable = new Promise((res, rej) => {
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='session_fatigue_flags'", (err, row) => {
        if (err) return rej(err);
        if (!row) {
          console.log('⚙️  Running migration: Creating session_fatigue_flags table...');
          const createTableSQL = `
            CREATE TABLE session_fatigue_flags (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              session_id INTEGER NOT NULL,
              timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
              fatigue_level REAL,
              blink_rate REAL,
              eye_openness REAL,
              data TEXT,
              FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            )`;
          db.run(createTableSQL, (err) => {
            if (err) return rej(err);
            console.log('✓ Migration completed: session_fatigue_flags table created');
            res({ migrated: true });
          });
        } else {
          res({ migrated: false });
        }
      });
    });

    // Migration 4: Add session_distraction_events table if missing
    const checkDistractionEventsTable = new Promise((res, rej) => {
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='session_distraction_events'", (err, row) => {
        if (err) return rej(err);
        if (!row) {
          console.log('⚙️  Running migration: Creating session_distraction_events table...');
          const createTableSQL = `
            CREATE TABLE session_distraction_events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              session_id INTEGER NOT NULL,
              timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
              distraction_type TEXT,
              focus_score REAL,
              gaze_deviation REAL,
              duration_seconds REAL,
              data TEXT,
              FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            )`;
          db.run(createTableSQL, (err) => {
            if (err) return rej(err);
            console.log('✓ Migration completed: session_distraction_events table created');
            res({ migrated: true });
          });
        } else {
          // Table exists, check if it has all required columns
          db.all("PRAGMA table_info(session_distraction_events)", (err, columns) => {
            if (err) return rej(err);
            const columnNames = columns.map(col => col.name);
            const requiredColumns = ['distraction_type', 'focus_score', 'gaze_deviation', 'duration_seconds'];
            const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
            
            if (missingColumns.length > 0) {
              console.log(`⚙️  Running migration: Recreating session_distraction_events table (missing columns: ${missingColumns.join(', ')})...`);
              // Drop and recreate with correct schema
              db.run("DROP TABLE session_distraction_events", (err) => {
                if (err) return rej(err);
                const createTableSQL = `
                  CREATE TABLE session_distraction_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    distraction_type TEXT,
                    focus_score REAL,
                    gaze_deviation REAL,
                    duration_seconds REAL,
                    data TEXT,
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                  )`;
                db.run(createTableSQL, (err) => {
                  if (err) return rej(err);
                  console.log('✓ Migration completed: session_distraction_events table recreated');
                  res({ migrated: true });
                });
              });
            } else {
              res({ migrated: false });
            }
          });
        }
      });
    });

    // Run all migrations
    Promise.all([
      checkContextColumn,
      checkFacialMetricsTable,
      checkFatigueFlagsTable,
      checkDistractionEventsTable
    ])
      .then((results) => {
        const anyMigrated = results.some(r => r.migrated);
        if (!anyMigrated) {
          console.log('✓ All migrations up to date\n');
        } else {
          console.log('✓ All migrations completed\n');
        }
        db.close();
        resolve({ migrated: anyMigrated });
      })
      .catch((err) => {
        console.error('❌ Migration failed:', err.message);
        db.close();
        reject(err);
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
