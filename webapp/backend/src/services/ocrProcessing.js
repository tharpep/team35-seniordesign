/**
 * OCR Processing Service
 * Handles spawning Python process to run img2study OCR on captured frames
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const PYTHON_PATH = process.env.PYTHON_PATH || 'python'; // Will be 'py -3.12' or path to python.exe
const IMG2STUDY_SCRIPT = path.join(__dirname, '../../../../img2study/preprocess_working.py');
const TIMEOUT_MS = 60000; // 60 seconds timeout for OCR processing

/**
 * Process an image through OCR
 * @param {string} imagePath - Absolute path to the image file
 * @param {number} sessionId - Session ID for context association
 * @param {string} source - Source type ('screen' or 'external')
 * @returns {Promise<Object>} Processing result with success status and details
 */
async function processImage(imagePath, sessionId, source = 'screen') {
  console.log(`\n🔍 [OCR] Starting OCR processing...`);
  console.log(`  Image: ${imagePath}`);
  console.log(`  Session: ${sessionId}`);
  console.log(`  Source: ${source}`);

  // Validate image file exists
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  // Validate script exists
  if (!fs.existsSync(IMG2STUDY_SCRIPT)) {
    throw new Error(`OCR script not found: ${IMG2STUDY_SCRIPT}`);
  }

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    // Prepare Python command
    // If PYTHON_PATH is 'py -3.12', split it; otherwise use as-is
    const pythonCmd = PYTHON_PATH.includes(' ') ? PYTHON_PATH.split(' ') : [PYTHON_PATH];
    const args = [...pythonCmd.slice(1), IMG2STUDY_SCRIPT, imagePath, sessionId.toString(), source];
    const command = pythonCmd[0];

    console.log(`  PYTHON_PATH env var: ${PYTHON_PATH}`);
    console.log(`  Command: ${command} ${args.join(' ')}`);

    // Spawn Python process
    const pythonProcess = spawn(command, args, {
      cwd: path.dirname(IMG2STUDY_SCRIPT),
      env: {
        ...process.env,
        MIDDLEWARE_URL: process.env.MIDDLEWARE_URL || 'http://localhost:3001',
        PYTHONIOENCODING: 'utf-8', // Force UTF-8 output to avoid Windows console encoding issues
        // Disable oneDNN for Windows PaddlePaddle compatibility
        FLAGS_use_mkldnn: '0',
        PADDLE_INFERENCE_PASS_ENABLE: '0',
        CUDA_VISIBLE_DEVICES: ''  // Force CPU
      }
    });

    let stdout = '';
    let stderr = '';

    // Capture stdout
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      // Log OCR progress
      if (output.includes('✓') || output.includes('Completed')) {
        console.log(`  ${output.trim()}`);
      }
    });

    // Capture stderr
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Set timeout
    const timeout = setTimeout(() => {
      pythonProcess.kill();
      reject(new Error(`OCR processing timeout after ${TIMEOUT_MS / 1000}s`));
    }, TIMEOUT_MS);

    // Handle process completion
    pythonProcess.on('close', (code) => {
      clearTimeout(timeout);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (code === 0) {
        console.log(`  ✓ OCR completed successfully in ${duration}s`);
        resolve({
          success: true,
          duration: parseFloat(duration),
          stdout: stdout.trim(),
          stderr: stderr.trim()
        });
      } else {
        console.error(`  ✗ OCR failed with exit code ${code}`);
        if (stderr) {
          console.error(`  Error: ${stderr}`);
        }
        reject(new Error(`OCR process failed with exit code ${code}: ${stderr || 'Unknown error'}`));
      }
    });

    // Handle process errors
    pythonProcess.on('error', (error) => {
      clearTimeout(timeout);
      console.error(`  ✗ Failed to start OCR process: ${error.message}`);
      reject(new Error(`Failed to spawn Python process: ${error.message}`));
    });
  });
}

/**
 * Validate OCR environment is ready
 * @returns {Promise<Object>} Status of Python and dependencies
 */
async function validateEnvironment() {
  return new Promise((resolve) => {
    const pythonCmd = PYTHON_PATH.includes(' ') ? PYTHON_PATH.split(' ') : [PYTHON_PATH];
    const command = pythonCmd[0];
    const args = [...pythonCmd.slice(1), '--version'];

    const pythonProcess = spawn(command, args);
    
    let version = '';
    pythonProcess.stdout.on('data', (data) => {
      version += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve({
          available: true,
          version: version.trim(),
          scriptPath: IMG2STUDY_SCRIPT,
          scriptExists: fs.existsSync(IMG2STUDY_SCRIPT)
        });
      } else {
        resolve({
          available: false,
          error: 'Python not found or invalid',
          scriptPath: IMG2STUDY_SCRIPT,
          scriptExists: fs.existsSync(IMG2STUDY_SCRIPT)
        });
      }
    });

    pythonProcess.on('error', () => {
      resolve({
        available: false,
        error: 'Failed to execute Python command',
        scriptPath: IMG2STUDY_SCRIPT,
        scriptExists: fs.existsSync(IMG2STUDY_SCRIPT)
      });
    });
  });
}

module.exports = {
  processImage,
  validateEnvironment
};
