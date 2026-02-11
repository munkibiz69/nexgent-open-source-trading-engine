#!/usr/bin/env node

/**
 * Generate JWT Secret
 * 
 * Generates a secure random secret for JWT token signing.
 * Usage: node scripts/generate-secret.js
 */

import crypto from 'node:crypto';

function generateSecret() {
  return crypto.randomBytes(32).toString('base64');
}

const secret = generateSecret();

console.log('\n✅ Generated JWT Secret:');
console.log('─'.repeat(60));
console.log(secret);
console.log('─'.repeat(60));
console.log('\n📝 Add this to your .env file:');
console.log(`JWT_SECRET="${secret}"\n`);

