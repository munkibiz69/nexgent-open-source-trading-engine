/**
 * API Key Verification Utilities
 * 
 * Verifies API keys by looking up their hash in the database.
 * Uses timing-safe comparison to prevent timing attacks.
 */

import crypto from 'crypto';
import { prisma } from '@/infrastructure/database/client.js';
import { hashApiKey, isApiKeyFormat } from './generate.js';

export interface VerifiedApiKey {
  id: string;
  userId: string;
  email: string;
  scopes: string[];
}

/**
 * Verify an API key and return the associated user info
 * 
 * @param key - The raw API key to verify
 * @returns Verified key info if valid, null if invalid
 */
export async function verifyApiKey(key: string): Promise<VerifiedApiKey | null> {
  // Quick format check
  if (!isApiKeyFormat(key)) {
    return null;
  }

  // Hash the key
  const keyHash = hashApiKey(key);

  // Look up the key in the database
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!apiKey) {
    return null;
  }

  // Use timing-safe comparison for the hash
  // This prevents timing attacks where an attacker could measure response times
  const storedHashBuffer = Buffer.from(apiKey.keyHash, 'hex');
  const providedHashBuffer = Buffer.from(keyHash, 'hex');

  if (
    storedHashBuffer.length !== providedHashBuffer.length ||
    !crypto.timingSafeEqual(storedHashBuffer, providedHashBuffer)
  ) {
    return null;
  }

  return {
    id: apiKey.id,
    userId: apiKey.user.id,
    email: apiKey.user.email,
    scopes: apiKey.scopes,
  };
}

/**
 * Check if a scope is valid for an API key
 * 
 * @param scopes - The scopes the API key has
 * @param requiredScope - The scope required for the operation
 * @returns True if the key has the required scope
 */
export function hasScope(scopes: string[], requiredScope: string): boolean {
  // full_access grants all permissions
  if (scopes.includes('full_access')) {
    return true;
  }

  return scopes.includes(requiredScope);
}
