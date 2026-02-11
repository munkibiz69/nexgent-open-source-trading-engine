#!/usr/bin/env node

/**
 * Cloudflare Tunnel Script
 * 
 * Starts a Cloudflare Tunnel (cloudflared) to expose local webhook endpoints.
 * 
 * Usage:
 *   pnpm webhook:tunnel
 * 
 * Requirements:
 *   - cloudflared must be installed: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
 *   - Backend server should be running on PORT (default: 4000)
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '../../../.env') });

// Get PORT from env, but default to 4000 (not 5432 which is PostgreSQL)
const PORT = process.env.PORT && process.env.PORT !== '5432' ? process.env.PORT : '4000';
const TUNNEL_TOKEN = process.env.CLOUDFLARE_TUNNEL_TOKEN;

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  console.error(`${colors.red}${message}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.cyan}${message}${colors.reset}`);
}

// Check if cloudflared is installed
function checkCloudflared() {
  return new Promise((resolve) => {
    // On Windows, try 'cloudflared' first (works in PATH), then 'cloudflared.exe'
    const command = 'cloudflared';
    
    const check = spawn(command, ['--version'], {
      stdio: 'pipe',
      shell: true,
      windowsVerbatimArguments: false,
    });

    let output = '';
    let errorOutput = '';

    check.stdout?.on('data', (data) => {
      output += data.toString();
    });

    check.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });

    check.on('error', () => {
      resolve(false);
    });

    check.on('close', (code) => {
      // If exit code is 0, or if we got version output, it's installed
      if (code === 0 || output.includes('cloudflared') || errorOutput.includes('cloudflared')) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      try {
        check.kill();
      } catch (e) {
        // Ignore errors when killing
      }
      resolve(false);
    }, 5000);
  });
}

// Extract URL from cloudflared output
function extractUrl(line) {
  // cloudflared outputs URLs in various formats:
  // - "https://random-subdomain.trycloudflare.com"
  // - "Your quick Tunnel has been created! Visit it at (it may take some time to be reachable): https://..."
  // We want to match trycloudflare.com URLs specifically, or look for the tunnel URL pattern
  const urlMatch = line.match(/https?:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (urlMatch) {
    return urlMatch[0];
  }
  return null;
}

async function startTunnel() {
  log('\n🚇 Starting Cloudflare Tunnel...\n', 'bright');

  // Check if cloudflared is installed
  log('Checking for cloudflared...', 'cyan');
  const isInstalled = await checkCloudflared();

  if (!isInstalled) {
    logError('\n❌ cloudflared is not installed or not in PATH');
    log('\nTo install cloudflared:');
    
    if (process.platform === 'win32') {
      log('  Windows:', 'yellow');
      log('    Option 1 (Recommended - PowerShell as Admin):', 'cyan');
      log('      winget install --id Cloudflare.cloudflared', 'bright');
      log('    Option 2 (Chocolatey):', 'cyan');
      log('      choco install cloudflared', 'bright');
      log('    Option 3 (Manual):', 'cyan');
      log('      Download from: https://github.com/cloudflare/cloudflared/releases/latest', 'bright');
      log('      Look for: cloudflared-windows-amd64.exe', 'bright');
      log('      Rename to cloudflared.exe and add to PATH', 'bright');
    } else if (process.platform === 'darwin') {
      log('  macOS:', 'yellow');
      log('    brew install cloudflare/cloudflare/cloudflared', 'bright');
    } else {
      log('  Linux:', 'yellow');
      log('    Visit: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/', 'bright');
    }
    
    log('\nOr download from: https://github.com/cloudflare/cloudflared/releases/latest', 'cyan');
    log('\nAfter installation, restart your terminal and try again.\n', 'yellow');
    process.exit(1);
  }

  logSuccess('✅ cloudflared found\n');

  // Check if backend is running
  log(`Checking if backend is running on port ${PORT}...`, 'cyan');
  try {
    const response = await fetch(`http://localhost:${PORT}/health`);
    if (response.ok) {
      logSuccess(`✅ Backend is running on port ${PORT}\n`);
    } else {
      logError(`⚠️  Backend responded with status ${response.status}`);
      log('   Continuing anyway...\n', 'yellow');
    }
  } catch (error) {
    logError(`⚠️  Could not connect to backend on port ${PORT}`);
    log('   Make sure your backend server is running:', 'yellow');
    log(`   pnpm dev\n`, 'yellow');
  }

  // Build cloudflared command
  // Use persistent tunnel if token is provided
  let args;
  // Use 'cloudflared' (works in PATH on all platforms)
  const command = 'cloudflared';
  
  if (TUNNEL_TOKEN) {
    log('Using persistent tunnel (CLOUDFLARE_TUNNEL_TOKEN detected)...', 'cyan');
    args = ['tunnel', 'run', '--token', TUNNEL_TOKEN];
  } else {
    log('Using ephemeral tunnel (URL will change on restart)...', 'cyan');
    log('   To use a persistent URL, set CLOUDFLARE_TUNNEL_TOKEN in your .env file\n', 'yellow');
    args = ['tunnel', '--url', `http://localhost:${PORT}`];
  }

  log('\n' + '─'.repeat(60), 'cyan');
  log('Starting tunnel...', 'bright');
  log('─'.repeat(60) + '\n', 'cyan');

  // Start cloudflared
  const cloudflared = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    windowsVerbatimArguments: false,
  });

  let webhookUrl = null;
  let urlFound = false;

  // Parse stdout for URL
  cloudflared.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);

    // Try to extract URL from output - look for trycloudflare.com URLs
    if (!urlFound) {
      const url = extractUrl(output);
      if (url && url.includes('trycloudflare.com')) {
        webhookUrl = url;
        urlFound = true;
        log('\n' + '═'.repeat(60), 'green');
        log('✅ WEBHOOK URL READY', 'bright');
        log('═'.repeat(60), 'green');
        log(`\n${colors.bright}${colors.green}${url}${colors.reset}\n`, 'green');
        log('Use this URL to configure your webhooks:', 'cyan');
        log(`  ${url}/api/webhooks/test`, 'bright');
        log('\nPress Ctrl+C to stop the tunnel\n', 'yellow');
        log('─'.repeat(60) + '\n', 'cyan');
      }
    }
  });

  // Parse stderr for URL (cloudflared sometimes outputs to stderr)
  cloudflared.stderr.on('data', (data) => {
    const output = data.toString();
    process.stderr.write(output);

    // Try to extract URL from stderr too - look for trycloudflare.com URLs
    if (!urlFound) {
      const url = extractUrl(output);
      if (url && url.includes('trycloudflare.com')) {
        webhookUrl = url;
        urlFound = true;
        log('\n' + '═'.repeat(60), 'green');
        log('✅ WEBHOOK URL READY', 'bright');
        log('═'.repeat(60), 'green');
        log(`\n${colors.bright}${colors.green}${url}${colors.reset}\n`, 'green');
        log('Use this URL to configure your webhooks:', 'cyan');
        log(`  ${url}/api/webhooks/test`, 'bright');
        log('\nPress Ctrl+C to stop the tunnel\n', 'yellow');
        log('─'.repeat(60) + '\n', 'cyan');
      }
    }
  });

  // Handle errors
  cloudflared.on('error', (error) => {
    logError(`\n❌ Failed to start cloudflared: ${error.message}`);
    process.exit(1);
  });

  // Handle exit
  cloudflared.on('close', (code) => {
    if (code !== 0 && code !== null) {
      logError(`\n❌ cloudflared exited with code ${code}`);
      process.exit(1);
    }
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    log('\n\n🛑 Stopping tunnel...', 'yellow');
    cloudflared.kill('SIGINT');
    setTimeout(() => {
      logSuccess('✅ Tunnel stopped');
      process.exit(0);
    }, 1000);
  });

  process.on('SIGTERM', () => {
    cloudflared.kill('SIGTERM');
    process.exit(0);
  });
}

// Start the tunnel
startTunnel().catch((error) => {
  logError(`\n❌ Error: ${error.message}`);
  process.exit(1);
});

