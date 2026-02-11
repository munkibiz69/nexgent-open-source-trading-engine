/**
 * API Keys schema (Zod) unit tests
 *
 * Validates CreateApiKeySchema and ApiKeyScopeEnum for API contract safety.
 */

import { describe, it, expect } from 'vitest';
import {
  CreateApiKeySchema,
  ApiKeyScopeEnum,
} from '../../src/validators/api-keys.schema.js';

describe('ApiKeyScopeEnum', () => {
  it('should accept all valid scopes', () => {
    const scopes = ['signals', 'agents', 'positions', 'balances', 'transactions', 'history', 'full_access'];
    for (const scope of scopes) {
      const result = ApiKeyScopeEnum.safeParse(scope);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid scope', () => {
    expect(ApiKeyScopeEnum.safeParse('invalid').success).toBe(false);
    expect(ApiKeyScopeEnum.safeParse('').success).toBe(false);
  });
});

describe('CreateApiKeySchema', () => {
  it('should accept valid name and non-empty scopes array', () => {
    const result = CreateApiKeySchema.safeParse({
      name: 'My API Key',
      scopes: ['signals', 'agents'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('My API Key');
      expect(result.data.scopes).toEqual(['signals', 'agents']);
    }
  });

  it('should accept single scope', () => {
    const result = CreateApiKeySchema.safeParse({
      name: 'Key',
      scopes: ['full_access'],
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty name', () => {
    expect(
      CreateApiKeySchema.safeParse({ name: '', scopes: ['signals'] }).success
    ).toBe(false);
  });

  it('should reject name longer than 100 characters', () => {
    expect(
      CreateApiKeySchema.safeParse({
        name: 'a'.repeat(101),
        scopes: ['signals'],
      }).success
    ).toBe(false);
  });

  it('should reject empty scopes array', () => {
    const result = CreateApiKeySchema.safeParse({
      name: 'Key',
      scopes: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message?.includes('At least one scope'))).toBe(true);
    }
  });

  it('should reject invalid scope in array', () => {
    expect(
      CreateApiKeySchema.safeParse({
        name: 'Key',
        scopes: ['signals', 'invalid_scope'],
      }).success
    ).toBe(false);
  });
});
