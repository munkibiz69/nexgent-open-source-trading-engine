/**
 * API Key Generation Utilities
 * 
 * Generates secure API keys with the format: nex_<32_random_chars>
 * Keys are hashed with SHA-256 before storage.
 */

import crypto from 'crypto';

const API_KEY_PREFIX = 'nex_';

export interface GeneratedApiKey {
  /** The raw API key (shown once, never stored) */
  key: string;
  /** SHA-256 hash of the key (stored in database) */
  hash: string;
  /** First part of key for identification (e.g., "nex_a1b2") */
  prefix: string;
}

/**
 * Generate a new API key
 * 
 * @returns Object containing the raw key, hash, and prefix
 */
export function generateApiKey(): GeneratedApiKey {
  // Generate 24 random bytes, encode as base64url (32 chars)
  const randomPart = crypto.randomBytes(24).toString('base64url');
  
  // Full key with prefix
  const key = `${API_KEY_PREFIX}${randomPart}`;
  
  // Hash the key with SHA-256
  const hash = hashApiKey(key);
  
  // Store prefix for identification (e.g., "nex_a1b2")
  const prefix = `${API_KEY_PREFIX}${randomPart.slice(0, 4)}`;
  
  return { key, hash, prefix };
}

/**
 * Hash an API key using SHA-256
 * 
 * @param key - The raw API key to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Check if a string looks like a valid API key format
 * 
 * @param key - String to check
 * @returns True if the string matches API key format
 */
export function isApiKeyFormat(key: string): boolean {
  // Must start with prefix and be approximately 37 chars (nex_ + 32 chars)
  return key.startsWith(API_KEY_PREFIX) && key.length >= 36 && key.length <= 40;
}
