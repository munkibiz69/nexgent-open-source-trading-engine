/**
 * Agent schema (Zod) unit tests
 *
 * Validates CreateAgentSchema and UpdateAgentSchema for API contract safety.
 */

import { describe, it, expect } from 'vitest';
import {
  CreateAgentSchema,
  UpdateAgentSchema,
} from '../../src/validators/agents.schema.js';

describe('CreateAgentSchema', () => {
  it('should accept valid name and tradingMode', () => {
    const result = CreateAgentSchema.safeParse({
      name: 'My Agent',
      tradingMode: 'simulation',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('My Agent');
      expect(result.data.tradingMode).toBe('simulation');
    }
  });

  it('should default tradingMode to simulation when omitted', () => {
    const result = CreateAgentSchema.safeParse({ name: 'Agent Only' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.tradingMode).toBe('simulation');
  });

  it('should accept live trading mode', () => {
    const result = CreateAgentSchema.safeParse({
      name: 'Live Agent',
      tradingMode: 'live',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.tradingMode).toBe('live');
  });

  it('should reject name shorter than 3 characters', () => {
    expect(CreateAgentSchema.safeParse({ name: 'ab' }).success).toBe(false);
    expect(CreateAgentSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('should reject name longer than 50 characters', () => {
    const longName = 'a'.repeat(51);
    expect(CreateAgentSchema.safeParse({ name: longName }).success).toBe(false);
  });

  it('should reject invalid tradingMode', () => {
    expect(
      CreateAgentSchema.safeParse({ name: 'Agent', tradingMode: 'invalid' }).success
    ).toBe(false);
  });
});

describe('UpdateAgentSchema', () => {
  it('should accept empty object (all optional)', () => {
    expect(UpdateAgentSchema.safeParse({}).success).toBe(true);
  });

  it('should accept partial name update', () => {
    const result = UpdateAgentSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe('New Name');
  });

  it('should accept partial tradingMode update', () => {
    const result = UpdateAgentSchema.safeParse({ tradingMode: 'live' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.tradingMode).toBe('live');
  });

  it('should accept optional booleans for automated trading', () => {
    const result = UpdateAgentSchema.safeParse({
      automatedTradingSimulation: true,
      automatedTradingLive: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.automatedTradingSimulation).toBe(true);
      expect(result.data.automatedTradingLive).toBe(false);
    }
  });

  it('should reject name shorter than 3 when provided', () => {
    expect(UpdateAgentSchema.safeParse({ name: 'ab' }).success).toBe(false);
  });

  it('should reject invalid tradingMode when provided', () => {
    expect(
      UpdateAgentSchema.safeParse({ tradingMode: 'invalid' }).success
    ).toBe(false);
  });
});
