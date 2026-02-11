/**
 * Wallet schema (Zod) unit tests
 *
 * Validates AssignWalletSchema for API contract safety.
 */

import { describe, it, expect } from 'vitest';
import { AssignWalletSchema } from '../../src/validators/wallets.schema.js';

describe('AssignWalletSchema', () => {
  it('should accept valid agentId (UUID), walletAddress, and walletType', () => {
    const result = AssignWalletSchema.safeParse({
      agentId: '550e8400-e29b-41d4-a716-446655440000',
      walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      walletType: 'simulation',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.agentId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.data.walletType).toBe('simulation');
    }
  });

  it('should accept walletType live', () => {
    const result = AssignWalletSchema.safeParse({
      agentId: '550e8400-e29b-41d4-a716-446655440000',
      walletAddress: 'addr',
      walletType: 'live',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.walletType).toBe('live');
  });

  it('should reject invalid agentId (not UUID)', () => {
    const result = AssignWalletSchema.safeParse({
      agentId: 'not-a-uuid',
      walletAddress: 'addr',
      walletType: 'simulation',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message?.includes('Agent') || i.message?.includes('uuid'))).toBe(true);
    }
  });

  it('should reject empty walletAddress', () => {
    expect(
      AssignWalletSchema.safeParse({
        agentId: '550e8400-e29b-41d4-a716-446655440000',
        walletAddress: '',
        walletType: 'simulation',
      }).success
    ).toBe(false);
  });

  it('should reject invalid walletType', () => {
    expect(
      AssignWalletSchema.safeParse({
        agentId: '550e8400-e29b-41d4-a716-446655440000',
        walletAddress: 'addr',
        walletType: 'invalid',
      }).success
    ).toBe(false);
  });
});
