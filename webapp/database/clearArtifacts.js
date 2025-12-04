const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// DB path (same convention as other database scripts)
const dbPath = path.join(__dirname, 'studycoach.db');
const db = new sqlite3.Database(dbPath);

// Simple CLI arg parsing: --yes to skip confirm, --session <id> to target one session
const args = process.argv.slice(2);
const yesFlag = args.includes('--yes') || args.includes('-y');
const sessionIndex = Math.max(args.indexOf('--session'), args.indexOf('-s'));
const sessionId = sessionIndex > -1 ? Number(args[sessionIndex + 1]) : undefined;

if (Number.isNaN(sessionId)) {
  console.error('Invalid value for --session. It must be a number.');
  process.exit(1);
}

function getCount(whereSql = '', params = []) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT COUNT(*) AS cnt FROM study_artifacts ${whereSql}`, params, (err, row) => {
      if (err) return reject(err);
      resolve(row?.cnt || 0);
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this.changes || 0);
    });
  });
}

async function clearArtifacts() {
  try {
    const scopeDesc = sessionId ? `for session_id=${sessionId}` : 'for ALL sessions';

    if (!yesFlag) {
      console.error('Refusing to proceed without confirmation.');
      console.error('Rerun with --yes to confirm deletion, optionally with --session <id>.');
      console.error('Example: node clearArtifacts.js --yes            (delete all)');
      console.error('         node clearArtifacts.js --yes --session 3 (delete for session 3)');
      process.exit(1);
    }

    const whereSql = sessionId ? 'WHERE session_id = ?' : '';
    const params = sessionId ? [sessionId] : [];

    const before = await getCount(whereSql, params);
    console.log(`Found ${before} artifact(s) ${scopeDesc}.`);

    if (before === 0) {
      console.log('Nothing to delete. Done.');
      return;
    }

    const deleted = await run(`DELETE FROM study_artifacts ${whereSql}`, params);
    // Optionally reset AUTOINCREMENT counter when clearing all
    if (!sessionId) {
      try {
        await run(`DELETE FROM sqlite_sequence WHERE name = 'study_artifacts'`);
      } catch (_) {
        // ignore if sqlite_sequence doesn't exist or other errors
      }
    }

    const after = await getCount(whereSql, params);
    console.log(`Deleted ${deleted} artifact row(s). Remaining matching rows: ${after}.`);
    console.log('Done.');
  } catch (err) {
    console.error('Error clearing artifacts:', err.message || err);
    process.exit(1);
  } finally {
    db.close();
  }
}

clearArtifacts();

