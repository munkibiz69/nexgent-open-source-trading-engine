/**
 * Redis Balance Service Integration Tests
 * 
 * Tests Redis caching operations for balances with real Redis instance.
 */

// Set test Redis database BEFORE any imports
process.env.REDIS_DB = '1';

import { RedisBalanceService } from '@/infrastructure/cache/redis-balance-service.js';
import { redisService } from '@/infrastructure/cache/redis-client.js';
import { getTestRedis, connectTestRedis, cleanupTestRedis, disconnectTestRedis } from '../../helpers/test-redis.js';
import type { CachedAgentBalance } from '@/infrastructure/cache/redis-balance-service.js';

describe('RedisBalanceService Integration', () => {
  let redisBalanceService: RedisBalanceService;
  let redis: ReturnType<typeof getTestRedis>;

  beforeAll(async () => {
    redis = getTestRedis();
    await connectTestRedis();
    
    // Connect the service Redis client to test database
    await redisService.connect();
    
    redisBalanceService = RedisBalanceService.getInstance();
  });

  beforeEach(async () => {
    // Clean up using the service's Redis client to ensure we're cleaning the same database
    const serviceClient = redisService.getClient();
    await serviceClient.flushdb();
  });

  afterAll(async () => {
    await redisService.disconnect();
    await disconnectTestRedis();
  });

  describe('setBalance and getBalance', () => {
    it('should cache and retrieve a balance', async () => {
      // Arrange
      const balance: CachedAgentBalance = {
        id: 'balance-123',
        agentId: 'agent-123',
        walletAddress: 'wallet-123',
        tokenAddress: 'So11111111111111111111111111111111111111112',
        tokenSymbol: 'SOL',
        balance: '1000000000', // 1 SOL in lamports
        lastUpdated: new Date(),
      };

      // Act
      await redisBalanceService.setBalance(balance);
      const retrieved = await redisBalanceService.getBalance(
        balance.agentId,
        balance.walletAddress,
        balance.tokenAddress
      );

      // Assert
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(balance.id);
      expect(retrieved?.agentId).toBe(balance.agentId);
      expect(retrieved?.walletAddress).toBe(balance.walletAddress);
      expect(retrieved?.tokenAddress).toBe(balance.tokenAddress);
      expect(retrieved?.balance).toBe(balance.balance);
    });

    it('should return null for non-existent balance', async () => {
      // Act
      const result = await redisBalanceService.getBalance(
        'agent-123',
        'wallet-123',
        'token-123'
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should handle date serialization correctly', async () => {
      // Arrange
      const testDate = new Date('2024-01-01T00:00:00Z');
      const balance: CachedAgentBalance = {
        id: 'balance-123',
        agentId: 'agent-123',
        walletAddress: 'wallet-123',
        tokenAddress: 'So11111111111111111111111111111111111111112',
        tokenSymbol: 'SOL',
        balance: '1000000000',
        lastUpdated: testDate,
      };

      // Act
      await redisBalanceService.setBalance(balance);
      const retrieved = await redisBalanceService.getBalance(
        balance.agentId,
        balance.walletAddress,
        balance.tokenAddress
      );

      // Assert
      expect(retrieved).not.toBeNull();
      expect(retrieved?.lastUpdated).toEqual(testDate);
    });
  });

  describe('invalidateBalance', () => {
    it('should remove balance from cache', async () => {
      // Arrange
      const balance: CachedAgentBalance = {
        id: 'balance-123',
        agentId: 'agent-123',
        walletAddress: 'wallet-123',
        tokenAddress: 'So11111111111111111111111111111111111111112',
        tokenSymbol: 'SOL',
        balance: '1000000000',
        lastUpdated: new Date(),
      };
      await redisBalanceService.setBalance(balance);

      // Act
      await redisBalanceService.invalidateBalance(
        balance.agentId,
        balance.walletAddress,
        balance.tokenAddress
      );
      const retrieved = await redisBalanceService.getBalance(
        balance.agentId,
        balance.walletAddress,
        balance.tokenAddress
      );

      // Assert
      expect(retrieved).toBeNull();
    });
  });

  describe('invalidateWalletBalances', () => {
    it('should remove all balances for a wallet', async () => {
      // Arrange
      const agentId = 'agent-123';
      const walletAddress = 'wallet-123';
      const balance1: CachedAgentBalance = {
        id: 'balance-1',
        agentId,
        walletAddress,
        tokenAddress: 'So11111111111111111111111111111111111111112',
        tokenSymbol: 'SOL',
        balance: '1000000000',
        lastUpdated: new Date(),
      };
      const balance2: CachedAgentBalance = {
        id: 'balance-2',
        agentId,
        walletAddress,
        tokenAddress: 'token-address-2',
        tokenSymbol: 'TOKEN',
        balance: '500000000',
        lastUpdated: new Date(),
      };
      await redisBalanceService.setBalance(balance1);
      await redisBalanceService.setBalance(balance2);

      // Act
      await redisBalanceService.invalidateWalletBalances(agentId, walletAddress);
      const retrieved1 = await redisBalanceService.getBalance(agentId, walletAddress, balance1.tokenAddress);
      const retrieved2 = await redisBalanceService.getBalance(agentId, walletAddress, balance2.tokenAddress);

      // Assert
      expect(retrieved1).toBeNull();
      expect(retrieved2).toBeNull();
    });
  });
});

