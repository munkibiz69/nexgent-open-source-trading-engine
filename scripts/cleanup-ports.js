#!/usr/bin/env node

/**
 * Cleanup script to kill processes using development ports
 * Usage: node scripts/cleanup-ports.js [--force]
 */

const { execSync } = require('child_process');
const os = require('os');

const ports = [3000, 4000]; // frontend and backend ports
const force = process.argv.includes('--force');

function killProcessOnPort(port) {
  const platform = os.platform();
  let command;
  let pid;

  try {
    if (platform === 'win32') {
      // Windows
      try {
        const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        const lines = result.trim().split('\n');
        
        for (const line of lines) {
          if (line.includes('LISTENING')) {
            const parts = line.trim().split(/\s+/);
            pid = parts[parts.length - 1];
            break;
          }
        }

        if (pid) {
          console.log(`⚠️  Found process ${pid} on port ${port}`);
          if (force) {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'inherit' });
            console.log(`   ✅ Killed process ${pid} on port ${port}`);
          } else {
            console.log(`   Run with --force to kill: taskkill /F /PID ${pid}`);
          }
        } else {
          console.log(`✅ Port ${port} is free`);
        }
      } catch (error) {
        // findstr returns non-zero exit code when no matches found
        // This means the port is free
        if (error.status === 1 || error.code === 1) {
          console.log(`✅ Port ${port} is free`);
        } else {
          throw error;
        }
      }
    } else {
      // Unix-like (Mac, Linux)
      try {
        pid = execSync(`lsof -ti:${port}`, { encoding: 'utf8' }).trim();
        if (pid) {
          console.log(`⚠️  Found process ${pid} on port ${port}`);
          if (force) {
            execSync(`kill -9 ${pid}`, { stdio: 'inherit' });
            console.log(`   ✅ Killed process ${pid} on port ${port}`);
          } else {
            console.log(`   Run with --force to kill: kill -9 ${pid}`);
          }
        } else {
          console.log(`✅ Port ${port} is free`);
        }
      } catch (error) {
        // lsof returns non-zero exit code when no process found
        if (error.status === 1 || error.code === 1) {
          console.log(`✅ Port ${port} is free`);
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error checking port ${port}:`, error.message);
  }
}

console.log('Checking development ports...\n');

for (const port of ports) {
  killProcessOnPort(port);
}

if (!force) {
  console.log('\n💡 Tip: Run with --force to automatically kill processes on these ports');
}

