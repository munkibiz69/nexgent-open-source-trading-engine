/**
 * JWT Utility Unit Tests
 *
 * Tests token generation, verification, and extraction without mocking.
 * Ensures auth security behavior: algorithm pinning, structure validation, expiry handling.
 */

import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  extractUserId,
  extractTokenType,
} from '@/shared/utils/auth/jwt.js';

const VALID_SECRET = 'test-jwt-secret-minimum-32-characters-long';

describe('JWT utilities', () => {
  let originalSecret: string | undefined;

  beforeEach(() => {
    originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = VALID_SECRET;
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  describe('getSecret (via generateAccessToken)', () => {
    it('should throw when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      expect(() => generateAccessToken('user-1', 'a@b.com')).toThrow(
        'JWT_SECRET environment variable is required'
      );
    });

    it('should throw when JWT_SECRET is shorter than 32 characters', () => {
      process.env.JWT_SECRET = 'short';
      expect(() => generateAccessToken('user-1', 'a@b.com')).toThrow(
        'JWT_SECRET must be at least 32 characters long for security'
      );
    });
  });

  describe('generateAccessToken', () => {
    it('should return a non-empty string', () => {
      const token = generateAccessToken('user-123', 'user@example.com');
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should produce a token that verifyToken decodes with correct payload', () => {
      const userId = 'user-456';
      const email = 'test@nexgent.io';
      const token = generateAccessToken(userId, email);
      const payload = verifyToken(token);

      expect(payload.userId).toBe(userId);
      expect(payload.email).toBe(email);
      expect(payload.type).toBe('access');
      expect(payload.jti).toBeDefined();
      expect(typeof payload.jti).toBe('string');
    });

    it('should produce different jti for each call', () => {
      const token1 = generateAccessToken('u1', 'a@b.com');
      const token2 = generateAccessToken('u1', 'a@b.com');
      const p1 = verifyToken(token1);
      const p2 = verifyToken(token2);
      expect(p1.jti).not.toBe(p2.jti);
    });
  });

  describe('generateRefreshToken', () => {
    it('should return token, jti, and expiresInSeconds', () => {
      const result = generateRefreshToken('user-1', 'u@e.com');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('jti');
      expect(result).toHaveProperty('expiresInSeconds');
      expect(typeof result.token).toBe('string');
      expect(typeof result.jti).toBe('string');
      expect(typeof result.expiresInSeconds).toBe('number');
    });

    it('should produce token with type refresh', () => {
      const result = generateRefreshToken('user-1', 'u@e.com');
      const payload = verifyToken(result.token);
      expect(payload.type).toBe('refresh');
      expect(payload.userId).toBe('user-1');
      expect(payload.email).toBe('u@e.com');
    });

    it('should use 24h TTL when rememberMe is false', () => {
      const result = generateRefreshToken('user-1', 'u@e.com', false);
      const expectedSeconds = 24 * 60 * 60;
      expect(result.expiresInSeconds).toBe(expectedSeconds);
    });

    it('should use 30d TTL when rememberMe is true', () => {
      const result = generateRefreshToken('user-1', 'u@e.com', true);
      const expectedSeconds = 30 * 24 * 60 * 60;
      expect(result.expiresInSeconds).toBe(expectedSeconds);
    });
  });

  describe('verifyToken', () => {
    it('should throw "Token expired" for an expired token', () => {
      const payload = {
        userId: 'u1',
        email: 'a@b.com',
        type: 'access' as const,
        jti: 'jti-1',
        exp: Math.floor(Date.now() / 1000) - 60,
        iat: Math.floor(Date.now() / 1000) - 120,
      };
      const token = jwt.sign(payload, VALID_SECRET, { algorithm: 'HS256' });

      expect(() => verifyToken(token)).toThrow('Token expired');
    });

    it('should throw "Invalid token" for wrong signature', () => {
      const token = generateAccessToken('u1', 'a@b.com');
      process.env.JWT_SECRET = 'other-secret-minimum-32-characters-long!!';

      expect(() => verifyToken(token)).toThrow('Invalid token');
    });

    it('should throw "Invalid token" for malformed token string', () => {
      expect(() => verifyToken('not-a-jwt')).toThrow('Invalid token');
      expect(() => verifyToken('')).toThrow('Invalid token');
    });

    it('should throw "Invalid token structure" when payload missing userId', () => {
      const payload = { email: 'a@b.com', type: 'access' };
      const token = jwt.sign(payload, VALID_SECRET, { algorithm: 'HS256' });

      expect(() => verifyToken(token)).toThrow('Invalid token structure');
    });

    it('should throw "Invalid token structure" when payload missing email', () => {
      const payload = { userId: 'u1', type: 'access' };
      const token = jwt.sign(payload, VALID_SECRET, { algorithm: 'HS256' });

      expect(() => verifyToken(token)).toThrow('Invalid token structure');
    });

    it('should throw "Invalid token structure" when payload missing type', () => {
      const payload = { userId: 'u1', email: 'a@b.com' };
      const token = jwt.sign(payload, VALID_SECRET, { algorithm: 'HS256' });

      expect(() => verifyToken(token)).toThrow('Invalid token structure');
    });

    it('should reject token signed with none algorithm when verified with HS256', () => {
      const payload = { userId: 'u1', email: 'a@b.com', type: 'access' };
      const token = jwt.sign(payload, '', { algorithm: 'none' } as jwt.SignOptions);

      expect(() => verifyToken(token)).toThrow('Invalid token');
    });
  });

  describe('extractUserId', () => {
    it('should return userId for valid token', () => {
      const token = generateAccessToken('user-xyz', 'x@y.com');
      expect(extractUserId(token)).toBe('user-xyz');
    });

    it('should return null for invalid/malformed token', () => {
      expect(extractUserId('garbage')).toBeNull();
      expect(extractUserId('')).toBeNull();
    });

    it('should return userId without verifying signature', () => {
      const payload = { userId: 'unsigned-user', email: 'a@b.com', type: 'access' };
      const token = jwt.sign(payload, 'wrong-secret', { algorithm: 'HS256' });
      expect(extractUserId(token)).toBe('unsigned-user');
    });
  });

  describe('extractTokenType', () => {
    it('should return "access" for access token', () => {
      const token = generateAccessToken('u1', 'a@b.com');
      expect(extractTokenType(token)).toBe('access');
    });

    it('should return "refresh" for refresh token', () => {
      const result = generateRefreshToken('u1', 'a@b.com');
      expect(extractTokenType(result.token)).toBe('refresh');
    });

    it('should return null for invalid token', () => {
      expect(extractTokenType('not-a-jwt')).toBeNull();
    });
  });
});
