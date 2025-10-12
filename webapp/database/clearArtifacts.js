const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'studycoach.db');
const db = new sqlite3.Database(dbPath);

console.log('Clearing study artifacts...\n');

db.run('DELETE FROM study_artifacts', (err) => {
  if (err) {
    console.error('✗ Error clearing artifacts:', err);
    db.close();
    process.exit(1);
  } else {
    console.log('✓ All study artifacts deleted');
    
    // Verify it's empty
    db.get('SELECT COUNT(*) as count FROM study_artifacts', (err, row) => {
      if (err) {
        console.error('Error verifying:', err);
      } else {
        console.log(`\nRemaining artifacts: ${row.count}`);
      }
      
      db.close(() => {
        console.log('\n✓ Done!');
        process.exit(0);
      });
    });
  }
});