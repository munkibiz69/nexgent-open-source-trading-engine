#!/usr/bin/env node

/**
 * Cleanup script to remove Next.js .next directory
 * Usage: node scripts/cleanup-next.js
 */

const fs = require('fs');
const path = require('path');

const nextDir = path.join(__dirname, '../packages/frontend/.next');

function removeDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log('✅ .next directory does not exist');
    return;
  }

  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log('✅ Successfully deleted .next directory');
  } catch (error) {
    console.error('❌ Error deleting .next directory:', error.message);
    console.error('   You may need to close any processes using these files');
    process.exit(1);
  }
}

console.log('Cleaning Next.js build directory...\n');
removeDir(nextDir);

