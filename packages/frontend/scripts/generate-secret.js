#!/usr/bin/env node

/**
 * Generate NextAuth Secret
 * 
 * Generates a secure random secret for NextAuth.js.
 * Usage: node scripts/generate-secret.js
 */

const crypto = require('crypto');

function generateSecret() {
  return crypto.randomBytes(32).toString('base64');
}

const secret = generateSecret();

console.log('\n✅ Generated NextAuth Secret:');
console.log('─'.repeat(60));
console.log(secret);
console.log('─'.repeat(60));
console.log('\n📝 Add this to your .env.local file:');
console.log(`NEXTAUTH_SECRET="${secret}"\n`);

