const fs = require('fs');
const path = require('path');

class SpecLogger {
  constructor() {
    this.logFile = null;
    this.sessionStart = null;
    this.stats = {
      'SPEC-1': { attempts: 0, passed: 0, durations: [], threshold: 500 },
      'SPEC-2': { attempts: 0, passed: 0, durations: [], threshold: 150 },
      'SPEC-3': { attempts: 0, passed: 0, durations: [], threshold: 1000 },
      'SPEC-5': { success: 0, failure: 0 },
      'SPEC-7': { checks: 0, passed: 0 },
      'SPEC-8': { attempts: 0, passed: 0, durations: [], threshold: 400 },
      'SPEC-9': { attempts: 0, passed: 0 }
    };
  }

  startSession() {
    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Create log file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    this.logFile = path.join(logsDir, `demo-${timestamp}.log`);
    this.sessionStart = Date.now();

    // Write header
    const header = `
${'='.repeat(80)}
COGNITIVE COACH - DEMO LOG
Started: ${new Date().toISOString().replace('T', ' ').slice(0, -5)}
${'='.repeat(80)}

`;
    fs.writeFileSync(this.logFile, header);
    console.log(`\n📋 Logging started: ${this.logFile}\n`);
  }

  logSpec(specId, data, passed, duration = null) {
    if (!this.logFile) return;

    const timestamp = new Date().toISOString().slice(11, -1); // HH:MM:SS.mmm
    const icon = passed ? '✓' : '✗';
    
    let logEntry = `\n[${timestamp}] ${icon} ${specId}: ${data.action} ${passed ? '✓' : '✗'}\n`;
    
    // Add duration for performance specs
    if (duration !== null && this.stats[specId].threshold) {
      const threshold = this.stats[specId].threshold;
      logEntry += `  Duration: ${duration}ms (threshold: ${threshold < 1000 ? '≤' : '<'}${threshold}ms)`;
      if (!passed) {
        logEntry += ` [EXCEEDED BY ${duration - threshold}ms]`;
      }
      logEntry += '\n';
    }

    // Add details
    if (data.details) {
      Object.entries(data.details).forEach(([key, value]) => {
        logEntry += `  ${key}: ${value}\n`;
      });
    }

    // Update statistics
    this.updateStats(specId, passed, duration, data);

    // Write to file
    fs.appendFileSync(this.logFile, logEntry);
  }

  updateStats(specId, passed, duration, data) {
    const stat = this.stats[specId];
    
    if (specId === 'SPEC-5') {
      // Upload success rate
      if (data.success) {
        stat.success++;
      } else {
        stat.failure++;
      }
    } else if (specId === 'SPEC-7') {
      // Data isolation
      stat.checks++;
      if (passed) stat.passed++;
    } else if (specId === 'SPEC-9') {
      // Validation
      stat.attempts++;
      if (passed) stat.passed++;
    } else if (duration !== null) {
      // Performance specs with duration
      stat.attempts++;
      if (passed) stat.passed++;
      stat.durations.push(duration);
    }
  }

  parseSpec3FromLog() {
    if (!this.logFile || !fs.existsSync(this.logFile)) return;
    
    try {
      const logContent = fs.readFileSync(this.logFile, 'utf8');
      const spec3Pattern = /\[.*?\] [✓✗] SPEC-3: MATERIAL DISPLAY [✓✗]\n  Duration: (\d+)ms/g;
      
      let match;
      while ((match = spec3Pattern.exec(logContent)) !== null) {
        const duration = parseInt(match[1]);
        const passed = duration <= 1000;
        
        this.stats['SPEC-3'].attempts++;
        if (passed) this.stats['SPEC-3'].passed++;
        this.stats['SPEC-3'].durations.push(duration);
      }
    } catch (err) {
      console.error('Error parsing SPEC-3 from log:', err);
    }
  }

  endSession() {
    if (!this.logFile) return;

    // Parse SPEC-3 entries from log file if they exist
    this.parseSpec3FromLog();

    const sessionDuration = Math.floor((Date.now() - this.sessionStart) / 1000);
    const minutes = Math.floor(sessionDuration / 60);
    const seconds = sessionDuration % 60;

    let summary = `\n${'='.repeat(80)}\nSUMMARY\n${'='.repeat(80)}\n`;
    summary += `Total Duration: ${minutes}m ${seconds}s\n\n`;

    // Performance Specs
    summary += `Performance Specs:\n`;
    const perfSpecs = [
      { id: 'SPEC-1', name: 'Frame Upload' },
      { id: 'SPEC-2', name: 'Metadata Persist' },
      { id: 'SPEC-3', name: 'Material Display' },
      { id: 'SPEC-8', name: 'Login Time' }
    ];
    
    perfSpecs.forEach(({ id, name }) => {
      const stat = this.stats[id];
      if (stat.attempts > 0) {
        const passRate = ((stat.passed / stat.attempts) * 100).toFixed(2);
        const avgDuration = Math.round(stat.durations.reduce((a, b) => a + b, 0) / stat.durations.length);
        const status = passRate === '100.00' ? '✓' : '✗';
        summary += `  ${id} (${name}): ${stat.passed}/${stat.attempts} passed (${passRate}%) ${status} | Avg: ${avgDuration}ms\n`;
      } else {
        summary += `  ${id} (${name}): No data recorded\n`;
      }
    });

    // Reliability Specs
    summary += `\nReliability Specs:\n`;
    const spec5 = this.stats['SPEC-5'];
    const totalUploads = spec5.success + spec5.failure;
    if (totalUploads > 0) {
      const successRate = ((spec5.success / totalUploads) * 100).toFixed(2);
      const status = parseFloat(successRate) >= 95 ? '✓' : '✗';
      summary += `  SPEC-5 (Upload Success Rate): ${spec5.success}/${totalUploads} success (${successRate}%) ${status}\n`;
    } else {
      summary += `  SPEC-5 (Upload Success Rate): No data recorded\n`;
    }

    // Security Specs
    summary += `\nSecurity Specs:\n`;
    const spec7 = this.stats['SPEC-7'];
    if (spec7.checks > 0) {
      const passRate = ((spec7.passed / spec7.checks) * 100).toFixed(2);
      const status = passRate === '100.00' ? '✓' : '✗';
      summary += `  SPEC-7 (Data Isolation): ${spec7.passed}/${spec7.checks} enforced (${passRate}%) ${status}\n`;
    } else {
      summary += `  SPEC-7 (Data Isolation): No data recorded\n`;
    }

    // Validation Specs
    summary += `\nValidation Specs:\n`;
    const spec9 = this.stats['SPEC-9'];
    if (spec9.attempts > 0) {
      const passRate = ((spec9.passed / spec9.attempts) * 100).toFixed(2);
      const status = passRate === '100.00' ? '✓' : '✗';
      summary += `  SPEC-9 (Payload Validation): ${spec9.passed}/${spec9.attempts} valid (${passRate}%) ${status}\n`;
    } else {
      summary += `  SPEC-9 (Payload Validation): No data recorded\n`;
    }

    summary += `${'='.repeat(80)}\n`;

    fs.appendFileSync(this.logFile, summary);
    console.log(`\n📋 Demo log saved: ${this.logFile}\n`);
    console.log(summary);
  }
}

// Create singleton instance
const logger = new SpecLogger();

module.exports = logger;