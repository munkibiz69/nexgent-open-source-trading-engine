/**
 * Password hashing and verification unit tests
 *
 * Tests validatePasswordStrength (pure), hashPassword, verifyPassword, and getSaltRounds.
 * Uses real bcrypt for hash/verify to ensure correct integration.
 */

import {
  validatePasswordStrength,
  hashPassword,
  verifyPassword,
  getSaltRounds,
} from '@/shared/utils/auth/password.js';

describe('validatePasswordStrength', () => {
  it('should return valid for a strong password', () => {
    const result = validatePasswordStrength('SecureP@ss1');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should require at least 8 characters', () => {
    const result = validatePasswordStrength('Short1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters long');
  });

  it('should reject passwords longer than 128 characters', () => {
    const long = 'A'.repeat(129);
    const result = validatePasswordStrength(long);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be no more than 128 characters long');
  });

  it('should require at least one uppercase letter', () => {
    const result = validatePasswordStrength('lowercase1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one uppercase letter');
  });

  it('should require at least one lowercase letter', () => {
    const result = validatePasswordStrength('UPPERCASE1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one lowercase letter');
  });

  it('should require at least one number', () => {
    const result = validatePasswordStrength('NoNumbers!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one number');
  });

  it('should require at least one special character', () => {
    const result = validatePasswordStrength('NoSpecial1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one special character');
  });

  it('should return all applicable errors for a weak password', () => {
    const result = validatePasswordStrength('abc');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
    expect(result.errors).toContain('Password must be at least 8 characters long');
  });
});

describe('hashPassword', () => {
  it('should return a bcrypt hash (starts with $2b$ or $2a$)', async () => {
    const hash = await hashPassword('SecureP@ss1');
    expect(hash).toMatch(/^\$2[ab]\$\d{2}\$/);
    expect(hash.length).toBeGreaterThan(50);
  });

  it('should produce different hashes for the same password (salt)', async () => {
    const hash1 = await hashPassword('SamePassword1!');
    const hash2 = await hashPassword('SamePassword1!');
    expect(hash1).not.toBe(hash2);
  });
});

describe('verifyPassword', () => {
  it('should return true when password matches hash', async () => {
    const password = 'VerifyMe1!';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should return false when password does not match hash', async () => {
    const hash = await hashPassword('CorrectPassword1!');
    const isValid = await verifyPassword('WrongPassword1!', hash);
    expect(isValid).toBe(false);
  });

  it('should return false for empty password with valid hash', async () => {
    const hash = await hashPassword('SomePassword1!');
    const isValid = await verifyPassword('', hash);
    expect(isValid).toBe(false);
  });
});

describe('getSaltRounds', () => {
  it('should return the configured salt rounds (12)', () => {
    expect(getSaltRounds()).toBe(12);
  });
});
