/**
 * Password hashing and verification utilities
 * 
 * Uses bcrypt for secure password hashing with configurable salt rounds.
 * Implements password strength validation according to security best practices.
 */

import bcrypt from 'bcrypt';

// Bcrypt salt rounds (12 is the recommended secure default)
const SALT_ROUNDS = 12;

/**
 * Validates password strength according to security requirements
 * 
 * Requirements:
 * - Minimum 8 characters, maximum 128 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * 
 * @param password - The password to validate
 * @returns Validation result with errors if invalid
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must be no more than 128 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Hashes a password using bcrypt
 * 
 * @param password - Plain text password to hash
 * @returns Promise resolving to the hashed password
 * @throws Error if hashing fails
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    return hashedPassword;
  } catch (_error) {
    throw new Error('Failed to hash password');
  }
}

/**
 * Verifies a password against a hash using constant-time comparison
 * 
 * Uses bcrypt.compare which implements constant-time comparison to prevent
 * timing attacks. Always takes the same amount of time regardless of where
 * the password differs.
 * 
 * @param password - Plain text password to verify
 * @param hash - Bcrypt hash to compare against
 * @returns Promise resolving to true if password matches, false otherwise
 * @throws Error if verification fails
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    const isValid = await bcrypt.compare(password, hash);
    return isValid;
  } catch (_error) {
    // Log error but don't expose details to prevent information leakage
    throw new Error('Failed to verify password');
  }
}

/**
 * Gets the configured salt rounds
 * 
 * @returns Number of salt rounds configured
 */
export function getSaltRounds(): number {
  return SALT_ROUNDS;
}

