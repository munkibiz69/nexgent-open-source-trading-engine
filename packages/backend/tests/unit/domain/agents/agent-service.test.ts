/**
 * Agent Service Unit Tests
 * 
 * Tests agent management logic (CRUD operations, cache synchronization).
 */

import { AgentService, AgentServiceError } from '@/domain/agents/agent-service.js';
import type { IAgentRepository } from '@/domain/agents/agent.repository.js';
import { createMockAgentId, createMockConfig } from '../../../helpers/test-factory.js';

// Mock dependencies
jest.mock('@/infrastructure/cache/redis-config-service.js', () => ({
  redisConfigService: {
    setAgentConfig: jest.fn(),
    invalidateAgentConfig: jest.fn(),
  },
}));

jest.mock('@/infrastructure/cache/redis-agent-service.js', () => ({
  redisAgentService: {
    addActiveAgent: jest.fn(),
    removeActiveAgent: jest.fn(),
    setTradingMode: jest.fn(),
  },
}));

jest.mock('@/infrastructure/cache/redis-position-service.js', () => ({
  redisPositionService: {
    deleteAgentPositions: jest.fn(),
  },
}));

jest.mock('@/infrastructure/cache/redis-balance-service.js', () => ({
  redisBalanceService: {
    deleteAgentBalances: jest.fn(),
  },
}));

jest.mock('@/domain/trading/config-service.js', () => ({
  configService: {
    mergeWithDefaults: jest.fn(),
    saveAgentConfig: jest.fn(),
    loadAgentConfig: jest.fn(),
  },
}));

jest.mock('@/infrastructure/wallets/index.js', () => ({
  walletService: {
    generateSimulationAddress: jest.fn(),
  },
}));

jest.mock('@/infrastructure/database/client.js', () => ({
  prisma: {
    agentWallet: {
      create: jest.fn(),
    },
  },
}));

describe('AgentService', () => {
  let agentService: AgentService;
  let mockRepository: jest.Mocked<IAgentRepository>;
  let mockRedisConfigService: any;
  let mockRedisAgentService: any;
  let mockRedisPositionService: any;
  let mockRedisBalanceService: any;
  let mockConfigService: any;
  let mockWalletService: any;
  let mockPrisma: any;

  const mockAgentId = createMockAgentId();
  const mockUserId = createMockAgentId();
  const mockWalletAddress = 'sim_test_wallet_address_12345678901234567890';

  const mockAgent = {
    id: mockAgentId,
    userId: mockUserId,
    name: 'Test Agent',
    tradingMode: 'simulation' as const,
    tradingConfig: null,
    automatedTradingSimulation: true,
    automatedTradingLive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConfig = createMockConfig();

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock repository
    mockRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findWalletByAddress: jest.fn(),
      findWalletByAgentId: jest.fn(),
    } as any;

    agentService = new AgentService(mockRepository);

    // Get mocked modules
    const redisConfigModule = await import('@/infrastructure/cache/redis-config-service.js');
    mockRedisConfigService = redisConfigModule.redisConfigService;

    const redisAgentModule = await import('@/infrastructure/cache/redis-agent-service.js');
    mockRedisAgentService = redisAgentModule.redisAgentService;

    const redisPositionModule = await import('@/infrastructure/cache/redis-position-service.js');
    mockRedisPositionService = redisPositionModule.redisPositionService;

    const redisBalanceModule = await import('@/infrastructure/cache/redis-balance-service.js');
    mockRedisBalanceService = redisBalanceModule.redisBalanceService;

    const configModule = await import('@/domain/trading/config-service.js');
    mockConfigService = configModule.configService;

    const walletModule = await import('@/infrastructure/wallets/index.js');
    mockWalletService = walletModule.walletService;

    const prismaModule = await import('@/infrastructure/database/client.js');
    mockPrisma = prismaModule.prisma;
  });

  describe('createAgent', () => {
    it('should create agent with default trading mode', async () => {
      // Arrange
      const createData = {
        userId: mockUserId,
        name: 'Test Agent',
      };

      mockRepository.create.mockResolvedValue(mockAgent);
      mockWalletService.generateSimulationAddress.mockReturnValue({
        address: mockWalletAddress,
      });
      mockPrisma.agentWallet.create.mockResolvedValue({});
      mockConfigService.mergeWithDefaults.mockReturnValue(mockConfig);
      mockRedisConfigService.setAgentConfig.mockResolvedValue(undefined);
      mockRedisAgentService.addActiveAgent.mockResolvedValue(undefined);

      // Act
      const result = await agentService.createAgent(createData);

      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith({
        user: { connect: { id: mockUserId } },
        name: 'Test Agent',
        tradingMode: 'simulation',
      });
      expect(mockWalletService.generateSimulationAddress).toHaveBeenCalled();
      expect(mockPrisma.agentWallet.create).toHaveBeenCalledWith({
        data: {
          agentId: mockAgentId,
          walletAddress: mockWalletAddress,
          walletType: 'simulation',
        },
      });
      expect(mockConfigService.mergeWithDefaults).toHaveBeenCalledWith(null);
      expect(mockRedisConfigService.setAgentConfig).toHaveBeenCalledWith(mockAgentId, mockConfig);
      expect(mockRedisAgentService.addActiveAgent).toHaveBeenCalledWith(
        mockAgentId,
        'simulation',
        true, // automatedTradingSimulation
        true  // automatedTradingLive
      );
      expect(result).toEqual(mockAgent);
    });

    it('should create agent with specified trading mode', async () => {
      // Arrange
      const createData = {
        userId: mockUserId,
        name: 'Test Agent',
        tradingMode: 'live' as const,
      };

      const liveAgent = { ...mockAgent, tradingMode: 'live' as const };
      mockRepository.create.mockResolvedValue(liveAgent);
      mockWalletService.generateSimulationAddress.mockReturnValue({
        address: mockWalletAddress,
      });
      mockPrisma.agentWallet.create.mockResolvedValue({});
      mockConfigService.mergeWithDefaults.mockReturnValue(mockConfig);
      mockRedisConfigService.setAgentConfig.mockResolvedValue(undefined);
      mockRedisAgentService.addActiveAgent.mockResolvedValue(undefined);

      // Act
      const result = await agentService.createAgent(createData);

      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith({
        user: { connect: { id: mockUserId } },
        name: 'Test Agent',
        tradingMode: 'live',
      });
      expect(result.tradingMode).toBe('live');
    });

    it('should handle cache sync failures gracefully', async () => {
      // Arrange
      const createData = {
        userId: mockUserId,
        name: 'Test Agent',
      };

      mockRepository.create.mockResolvedValue(mockAgent);
      mockWalletService.generateSimulationAddress.mockReturnValue({
        address: mockWalletAddress,
      });
      mockPrisma.agentWallet.create.mockResolvedValue({});
      mockConfigService.mergeWithDefaults.mockReturnValue(mockConfig);
      mockRedisConfigService.setAgentConfig.mockRejectedValue(new Error('Redis error'));

      // Act
      const result = await agentService.createAgent(createData);

      // Assert
      // Should still return agent even if cache sync fails
      expect(result).toEqual(mockAgent);
      expect(mockRedisConfigService.setAgentConfig).toHaveBeenCalled();
    });
  });

  describe('updateAgent', () => {
    it('should update agent name', async () => {
      // Arrange
      const updateData = { name: 'Updated Name' };
      const updatedAgent = { ...mockAgent, name: 'Updated Name' };

      mockRepository.findById.mockResolvedValue(mockAgent);
      mockRepository.update.mockResolvedValue(updatedAgent);

      // Act
      const result = await agentService.updateAgent(mockAgentId, updateData);

      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(mockAgentId);
      expect(mockRepository.update).toHaveBeenCalledWith(mockAgentId, {
        name: 'Updated Name',
      });
      expect(result).toEqual(updatedAgent);
      expect(mockRedisConfigService.invalidateAgentConfig).not.toHaveBeenCalled();
    });

    it('should update trading mode and invalidate cache', async () => {
      // Arrange
      const updateData = { tradingMode: 'live' as const };
      const updatedAgent = { ...mockAgent, tradingMode: 'live' as const };

      mockRepository.findById.mockResolvedValue(mockAgent);
      mockRepository.update.mockResolvedValue(updatedAgent);
      mockRedisConfigService.invalidateAgentConfig.mockResolvedValue(undefined);

      // Act
      const result = await agentService.updateAgent(mockAgentId, updateData);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(mockAgentId, {
        tradingMode: 'live',
      });
      expect(mockRedisConfigService.invalidateAgentConfig).toHaveBeenCalledWith(mockAgentId);
      expect(result.tradingMode).toBe('live');
    });

    it('should not invalidate cache if trading mode unchanged', async () => {
      // Arrange
      const updateData = { tradingMode: 'simulation' as const };
      const updatedAgent = { ...mockAgent, tradingMode: 'simulation' as const };

      mockRepository.findById.mockResolvedValue(mockAgent);
      mockRepository.update.mockResolvedValue(updatedAgent);

      // Act
      await agentService.updateAgent(mockAgentId, updateData);

      // Assert
      expect(mockRedisConfigService.invalidateAgentConfig).not.toHaveBeenCalled();
    });

    it('should throw error if agent not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert (single call, two assertions)
      const p = agentService.updateAgent(mockAgentId, { name: 'New Name' });
      await expect(p).rejects.toThrow(AgentServiceError);
      await expect(p).rejects.toThrow('Agent not found');
    });

    it('should handle cache invalidation failures gracefully', async () => {
      // Arrange
      const updateData = { tradingMode: 'live' as const };
      const updatedAgent = { ...mockAgent, tradingMode: 'live' as const };

      mockRepository.findById.mockResolvedValue(mockAgent);
      mockRepository.update.mockResolvedValue(updatedAgent);
      mockRedisConfigService.invalidateAgentConfig.mockRejectedValue(new Error('Redis error'));

      // Act
      const result = await agentService.updateAgent(mockAgentId, updateData);

      // Assert
      // Should still return updated agent even if cache invalidation fails
      expect(result).toEqual(updatedAgent);
    });
  });

  describe('deleteAgent', () => {
    it('should delete agent and cleanup cache', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(mockAgent);
      mockRepository.delete.mockResolvedValue(undefined);
      mockRedisAgentService.removeActiveAgent.mockResolvedValue(undefined);
      mockRedisConfigService.invalidateAgentConfig.mockResolvedValue(undefined);
      mockRedisPositionService.deleteAgentPositions.mockResolvedValue(undefined);
      mockRedisBalanceService.deleteAgentBalances.mockResolvedValue(undefined);

      // Act
      await agentService.deleteAgent(mockAgentId);

      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(mockAgentId);
      expect(mockRepository.delete).toHaveBeenCalledWith(mockAgentId);
      expect(mockRedisAgentService.removeActiveAgent).toHaveBeenCalledWith(mockAgentId);
      expect(mockRedisConfigService.invalidateAgentConfig).toHaveBeenCalledWith(mockAgentId);
      expect(mockRedisPositionService.deleteAgentPositions).toHaveBeenCalledWith(mockAgentId);
      expect(mockRedisBalanceService.deleteAgentBalances).toHaveBeenCalledWith(mockAgentId);
    });

    it('should throw error if agent not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert (single call, two assertions)
      const p = agentService.deleteAgent(mockAgentId);
      await expect(p).rejects.toThrow(AgentServiceError);
      await expect(p).rejects.toThrow('Agent not found');
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should handle cache cleanup failures gracefully', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(mockAgent);
      mockRepository.delete.mockResolvedValue(undefined);
      mockRedisAgentService.removeActiveAgent.mockRejectedValue(new Error('Redis error'));

      // Act
      await agentService.deleteAgent(mockAgentId);

      // Assert
      // Should still delete agent even if cache cleanup fails
      expect(mockRepository.delete).toHaveBeenCalledWith(mockAgentId);
    });
  });

  describe('updateAgentConfig', () => {
    it('should update config and reload from cache', async () => {
      // Arrange
      const newConfig = createMockConfig({
        signals: { ...mockConfig.signals, minScore: 5 }
      });

      mockRepository.findById.mockResolvedValue(mockAgent);
      mockConfigService.saveAgentConfig.mockResolvedValue(undefined);
      mockConfigService.loadAgentConfig.mockResolvedValue(newConfig);

      // Act
      const result = await agentService.updateAgentConfig(mockAgentId, newConfig);

      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(mockAgentId);
      expect(mockConfigService.saveAgentConfig).toHaveBeenCalledWith(mockAgentId, newConfig);
      expect(mockConfigService.loadAgentConfig).toHaveBeenCalledWith(mockAgentId);
      expect(result).toEqual(newConfig);
    });

    it('should reset config to defaults when null', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(mockAgent);
      mockConfigService.saveAgentConfig.mockResolvedValue(undefined);
      mockConfigService.loadAgentConfig.mockResolvedValue(mockConfig);

      // Act
      const result = await agentService.updateAgentConfig(mockAgentId, null);

      // Assert
      expect(mockConfigService.saveAgentConfig).toHaveBeenCalledWith(mockAgentId, null);
      expect(result).toEqual(mockConfig);
    });

    it('should throw error if agent not found', async () => {
      // Arrange
      const testConfig = createMockConfig();
      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert (single call, two assertions)
      const p = agentService.updateAgentConfig(mockAgentId, testConfig);
      await expect(p).rejects.toThrow(AgentServiceError);
      await expect(p).rejects.toThrow('Agent not found');
      expect(mockConfigService.saveAgentConfig).not.toHaveBeenCalled();
    });
  });
});

