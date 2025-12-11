const fs = require('fs');
const path = require('path');
const { getAll, runQuery } = require('../config/database');

// Delete frames older than 10 minutes
const FRAME_RETENTION_MS = 10 * 60 * 1000; // 10 minutes in milliseconds

const cleanupOldFrames = async () => {
  try {
    const tenMinutesAgo = new Date(Date.now() - FRAME_RETENTION_MS).toISOString();
    const cleanupTimestamp = new Date().toISOString();

    // Find all frames older than 10 minutes
    const oldFrames = await getAll(
      `SELECT id, file_path, session_id FROM captured_frames WHERE captured_at < ?`,
      [tenMinutesAgo]
    );

    if (oldFrames.length > 0) {
      console.log(`\n[RAW-IMAGE-CLEANUP] ${cleanupTimestamp}`);
      console.log(`🧹 Frame cleanup: Found ${oldFrames.length} raw image(s) older than ${FRAME_RETENTION_MS / 60000} minutes`);
    }

    let deletedFiles = 0;
    let deletedRecords = 0;
    let errors = 0;
    const sessionFolders = new Set();

    for (const frame of oldFrames) {
      try {
        // Delete physical file if it exists
        if (fs.existsSync(frame.file_path)) {
          const fileName = path.basename(frame.file_path);
          const fileSize = fs.statSync(frame.file_path).size;

          fs.unlinkSync(frame.file_path);
          deletedFiles++;

          // Log each raw image deletion for audit/compliance proof
          console.log(`[RAW-IMAGE-DELETE] ${cleanupTimestamp} | Session ${frame.session_id} | Deleted: ${fileName} (${(fileSize / 1024).toFixed(1)} KB)`);
          console.log(`  └─ Path: ${frame.file_path}`);
          console.log(`  └─ Reason: Raw image retention policy (>${FRAME_RETENTION_MS / 60000} min) - Only encrypted metrics retained in DB`);

          // Track session folder for cleanup check
          const sessionFolder = path.dirname(path.dirname(frame.file_path)); // Go up two levels (frameType folder -> session folder)
          sessionFolders.add(sessionFolder);
        }

        // Delete database record
        await runQuery('DELETE FROM captured_frames WHERE id = ?', [frame.id]);
        deletedRecords++;
      } catch (error) {
        console.error(`❌ Error deleting frame ${frame.id}:`, error.message);
        errors++;
      }
    }

    // Also check for all session folders that might be empty (not just ones we deleted from)
    const uploadsPath = path.join(__dirname, '../../../uploads/frames');
    if (fs.existsSync(uploadsPath)) {
      const allSessionFolders = fs.readdirSync(uploadsPath)
        .filter(item => item.startsWith('session_'))
        .map(item => path.join(uploadsPath, item));
      
      allSessionFolders.forEach(folder => sessionFolders.add(folder));
    }

    // Check and delete empty session folders
    let deletedFolders = 0;
    for (const sessionFolder of sessionFolders) {
      try {
        if (fs.existsSync(sessionFolder)) {
          // Check if folder is empty (no files in any subdirectories)
          const isEmpty = isDirectoryEmpty(sessionFolder);
          if (isEmpty) {
            fs.rmSync(sessionFolder, { recursive: true, force: true });
            deletedFolders++;
            console.log(`🗑️  Deleted empty session folder: ${path.basename(sessionFolder)}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error checking/deleting session folder ${sessionFolder}:`, error.message);
      }
    }

    if (deletedFiles > 0 || deletedFolders > 0) {
      console.log(`[RAW-IMAGE-CLEANUP-COMPLETE] ${new Date().toISOString()}`);
      console.log(`✓ Cleanup summary: ${deletedFiles} raw image(s) permanently deleted, ${deletedRecords} DB record(s) removed${deletedFolders > 0 ? `, ${deletedFolders} empty folder(s) removed` : ''}${errors > 0 ? `, ${errors} error(s)` : ''}`);
      console.log(`  └─ Privacy compliance: Raw images deleted after processing - Only metrics retained\n`);
    }
  } catch (error) {
    console.error('❌ Frame cleanup error:', error);
  }
};

// Helper function to check if a directory is empty (including subdirectories)
const isDirectoryEmpty = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    return true;
  }
  
  const items = fs.readdirSync(dirPath);
  
  if (items.length === 0) {
    return true;
  }
  
  // Check subdirectories
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isFile()) {
      return false; // Found a file
    } else if (stat.isDirectory()) {
      if (!isDirectoryEmpty(itemPath)) {
        return false; // Subdirectory contains files
      }
    }
  }
  
  return true; // No files found anywhere
};

// Start the cleanup scheduler
const startCleanupScheduler = () => {
  // Run cleanup every 2 minutes
  const CLEANUP_INTERVAL_MS = 2 * 60 * 1000;

  console.log('🧹 Starting frame cleanup scheduler (runs every 2 minutes, deletes frames older than 10 minutes)');
  
  // Run cleanup immediately on start
  cleanupOldFrames();

  // Schedule recurring cleanup
  setInterval(cleanupOldFrames, CLEANUP_INTERVAL_MS);
};

module.exports = {
  startCleanupScheduler,
  cleanupOldFrames
};
