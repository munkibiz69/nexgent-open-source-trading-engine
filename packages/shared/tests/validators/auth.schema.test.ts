/**
 * Auth schema (Zod) unit tests
 *
 * Validates LoginSchema, RegisterSchema, RefreshTokenSchema accept/reject inputs correctly.
 */

import { describe, it, expect } from 'vitest';
import { LoginSchema, RegisterSchema, RefreshTokenSchema } from '../../src/validators/auth.schema.js';

describe('LoginSchema', () => {
  it('should accept valid email and password', () => {
    const result = LoginSchema.safeParse({ email: 'user@example.com', password: 'secret' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.rememberMe).toBeUndefined();
  });

  it('should accept rememberMe optional boolean', () => {
    const result = LoginSchema.safeParse({
      email: 'a@b.com',
      password: 'p',
      rememberMe: true,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.rememberMe).toBe(true);
  });

  it('should reject invalid email', () => {
    expect(LoginSchema.safeParse({ email: 'not-an-email', password: 'p' }).success).toBe(false);
    expect(LoginSchema.safeParse({ email: '', password: 'p' }).success).toBe(false);
  });

  it('should reject empty password', () => {
    const result = LoginSchema.safeParse({ email: 'a@b.com', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === 'Password is required')).toBe(true);
    }
  });

  it('should reject missing email or password', () => {
    expect(LoginSchema.safeParse({ password: 'p' }).success).toBe(false);
    expect(LoginSchema.safeParse({ email: 'a@b.com' }).success).toBe(false);
  });
});

describe('RegisterSchema', () => {
  it('should accept valid email and password (min 8 chars)', () => {
    const result = RegisterSchema.safeParse({
      email: 'new@example.com',
      password: 'password1',
    });
    expect(result.success).toBe(true);
  });

  it('should reject password shorter than 8 characters', () => {
    const result = RegisterSchema.safeParse({
      email: 'a@b.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message?.includes('8'))).toBe(true);
    }
  });

  it('should reject invalid email', () => {
    expect(
      RegisterSchema.safeParse({ email: 'bad', password: 'longenough' }).success
    ).toBe(false);
  });
});

describe('RefreshTokenSchema', () => {
  it('should accept non-empty refresh token', () => {
    const result = RefreshTokenSchema.safeParse({ refreshToken: 'eyJhbGc...' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.refreshToken).toBe('eyJhbGc...');
  });

  it('should reject empty refresh token', () => {
    const result = RefreshTokenSchema.safeParse({ refreshToken: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message?.includes('Refresh token'))).toBe(true);
    }
  });

  it('should reject missing refreshToken', () => {
    expect(RefreshTokenSchema.safeParse({}).success).toBe(false);
  });
});
