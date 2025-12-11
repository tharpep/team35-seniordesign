/**
 * OCR Queue Manager
 * Simple in-memory queue for processing OCR tasks sequentially
 */

const ocrProcessing = require('./ocrProcessing');

// Queue state
const queue = [];
let isProcessing = false;
let stats = {
  totalProcessed: 0,
  totalSuccess: 0,
  totalFailed: 0,
  totalDuration: 0
};

/**
 * Add image to OCR processing queue
 * @param {number} sessionId - Session ID
 * @param {string} framePath - Absolute path to frame image
 * @param {string} frameType - Type of frame ('screen' or 'external')
 */
function addToQueue(sessionId, framePath, frameType) {
  const task = {
    sessionId,
    framePath,
    frameType,
    queuedAt: new Date(),
    attempts: 0
  };

  queue.push(task);
  console.log(`📝 [OCR Queue] Added to queue: ${frameType} frame for session ${sessionId}`);
  console.log(`   Queue size: ${queue.length}`);

  // Start processing if not already running
  if (!isProcessing) {
    processQueue();
  }
}

/**
 * Process queue sequentially
 * Runs continuously until queue is empty
 */
async function processQueue() {
  if (isProcessing) {
    return; // Already processing
  }

  if (queue.length === 0) {
    console.log(`✓ [OCR Queue] Queue empty, worker idle`);
    return;
  }

  isProcessing = true;
  console.log(`\n⚙️  [OCR Queue] Starting worker (${queue.length} task(s) in queue)`);

  while (queue.length > 0) {
    const task = queue.shift();
    console.log(`\n📸 [OCR Queue] Processing task (${queue.length} remaining)`);
    console.log(`   Session: ${task.sessionId}`);
    console.log(`   Type: ${task.frameType}`);
    console.log(`   Path: ${task.framePath}`);
    console.log(`   Queued: ${Math.round((Date.now() - task.queuedAt.getTime()) / 1000)}s ago`);

    try {
      // Process the image
      const result = await ocrProcessing.processImage(
        task.framePath,
        task.sessionId,
        task.frameType
      );

      // Update stats
      stats.totalProcessed++;
      stats.totalSuccess++;
      stats.totalDuration += result.duration;

      console.log(`✓ [OCR Queue] Task completed successfully`);
      console.log(`   Duration: ${result.duration}s`);
      console.log(`   Average: ${(stats.totalDuration / stats.totalProcessed).toFixed(2)}s`);

    } catch (error) {
      stats.totalProcessed++;
      stats.totalFailed++;

      console.error(`✗ [OCR Queue] Task failed: ${error.message}`);
      
      // Retry logic (optional - currently disabled)
      task.attempts++;
      if (task.attempts < 2) { // Max 1 retry
        console.log(`   Retrying (attempt ${task.attempts + 1}/2)...`);
        queue.push(task); // Re-queue at end
      } else {
        console.error(`   Max retries reached, skipping task`);
      }
    }
  }

  isProcessing = false;
  console.log(`\n✓ [OCR Queue] Worker finished, queue empty`);
  console.log(`   Stats: ${stats.totalSuccess} success, ${stats.totalFailed} failed, ${stats.totalProcessed} total`);
}

/**
 * Get current queue status
 * @returns {Object} Queue status and statistics
 */
function getStatus() {
  return {
    queueLength: queue.length,
    isProcessing,
    stats: {
      ...stats,
      averageDuration: stats.totalProcessed > 0 
        ? (stats.totalDuration / stats.totalProcessed).toFixed(2) 
        : 0
    },
    currentQueue: queue.map(task => ({
      sessionId: task.sessionId,
      frameType: task.frameType,
      queuedAt: task.queuedAt,
      attempts: task.attempts
    }))
  };
}

/**
 * Check if a file path is currently in the queue
 * @param {string} framePath - Absolute path to check
 * @returns {boolean} True if file is queued, false otherwise
 */
function isFileQueued(framePath) {
  return queue.some(task => task.framePath === framePath);
}

/**
 * Clear queue and reset stats (for testing)
 */
function clearQueue() {
  queue.length = 0;
  stats = {
    totalProcessed: 0,
    totalSuccess: 0,
    totalFailed: 0,
    totalDuration: 0
  };
  console.log(`🗑️  [OCR Queue] Queue cleared`);
}

module.exports = {
  addToQueue,
  getStatus,
  clearQueue,
  isFileQueued
};
