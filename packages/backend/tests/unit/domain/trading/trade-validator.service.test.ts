/**
 * Trade Validator Service Unit Tests
 * 
 * Tests trade execution validation logic.
 */

import { tradeValidator, TradeValidatorError } from '@/domain/trading/trade-validator.service.js';
import { createMockConfig, createMockAgentId, createMockWalletAddress } from '../../../helpers/test-factory.js';

// Mock dependencies
jest.mock('@/infrastructure/database/client.js', () => ({
  prisma: {
    agent: {
      findUnique: jest.fn(),
    },
    agentWallet: {
      findFirst: jest.fn(),
    },
    agentBalance: {
      findUnique: jest.fn(),
    },
    agentPosition: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/domain/trading/config-service.js', () => ({
  configService: {
    loadAgentConfig: jest.fn(),
  },
}));

jest.mock('@/domain/trading/position-service.js', () => ({
  positionService: {
    getPositionByToken: jest.fn(),
  },
}));

jest.mock('@/domain/trading/position-calculator.service.js', () => ({
  positionCalculator: {
    calculatePositionSize: jest.fn(),
  },
}));

jest.mock('@/infrastructure/cache/redis-balance-service.js', () => ({
  redisBalanceService: {
    getBalance: jest.fn(),
  },
}));

jest.mock('@/infrastructure/cache/redis-position-service.js', () => ({
  redisPositionService: {
    getAgentPositionIds: jest.fn().mockResolvedValue([]), // Default: no positions in cache
  },
}));

jest.mock('@/infrastructure/cache/redis-client.js', () => ({
  redisService: {
    getClient: jest.fn(),
    acquireLock: jest.fn(),
    releaseLock: jest.fn(),
  },
}));

jest.mock('@/infrastructure/wallets/index.js', () => ({
  walletStore: {
    isWalletAvailable: jest.fn(),
    getKeypair: jest.fn(),
    getLoadedCount: jest.fn(),
    getAllWalletAddresses: jest.fn(),
  },
}));

jest.mock('@/api/v1/wallets/helpers.js', () => ({
  validateWalletBelongsToAgent: jest.fn(),
}));

describe('TradeValidator', () => {
  let mockPrisma: any;
  let mockConfigService: any;
  let mockPositionService: any;
  let mockPositionCalculator: any;
  let mockRedisBalanceService: any;
  let mockWalletStore: any;
  let mockValidateWalletBelongsToAgent: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Get mocked services
    const prismaModule = await import('@/infrastructure/database/client.js');
    mockPrisma = prismaModule.prisma;
    
    const configServiceModule = await import('@/domain/trading/config-service.js');
    mockConfigService = configServiceModule.configService;
    
    const positionServiceModule = await import('@/domain/trading/position-service.js');
    mockPositionService = positionServiceModule.positionService;
    
    const positionCalculatorModule = await import('@/domain/trading/position-calculator.service.js');
    mockPositionCalculator = positionCalculatorModule.positionCalculator;
    
    const redisBalanceServiceModule = await import('@/infrastructure/cache/redis-balance-service.js');
    mockRedisBalanceService = redisBalanceServiceModule.redisBalanceService;
    
    const walletStoreModule = await import('@/infrastructure/wallets/index.js');
    mockWalletStore = walletStoreModule.walletStore;
    
    const helpersModule = await import('@/api/v1/wallets/helpers.js');
    mockValidateWalletBelongsToAgent = helpersModule.validateWalletBelongsToAgent;
    
    // Default mocks
    mockPrisma.agentPosition.findMany.mockResolvedValue([]);
    mockWalletStore.getLoadedCount.mockReturnValue(0);
    mockWalletStore.getAllWalletAddresses.mockReturnValue([]);
  });

  describe('validateTradeExecution', () => {
    const agentId = createMockAgentId();
    const walletAddress = createMockWalletAddress();
    const tokenAddress = 'Token123';

    it('should throw error when agent not found', async () => {
      // Arrange
      mockPrisma.agent.findUnique.mockResolvedValue(null);

      // Act & Assert (single call, two assertions to avoid double execution)
      const p = tradeValidator.validateTradeExecution(agentId, walletAddress, tokenAddress);
      await expect(p).rejects.toThrow(TradeValidatorError);
      await expect(p).rejects.toThrow('Agent not found');
    });

    it('should throw error when config loading fails', async () => {
      // Arrange
      mockPrisma.agent.findUnique.mockResolvedValue({
        id: agentId,
        tradingMode: 'simulation',
      });
      const configError = new Error('Config error');
      configError.name = 'ConfigServiceError';
      mockConfigService.loadAgentConfig.mockRejectedValue(configError);

      // Act & Assert (single call, two assertions)
      const p = tradeValidator.validateTradeExecution(agentId, walletAddress, tokenAddress);
      await expect(p).rejects.toThrow(TradeValidatorError);
      await expect(p).rejects.toThrow('Failed to load trading configuration');
    });

    it('should throw error when wallet not found', async () => {
      // Arrange
      const config = createMockConfig();
      mockPrisma.agent.findUnique.mockResolvedValue({
        id: agentId,
        tradingMode: 'simulation',
      });
      mockConfigService.loadAgentConfig.mockResolvedValue(config);
      mockPrisma.agentWallet.findFirst.mockResolvedValue(null);

      // Act & Assert (single call, two assertions)
      const p = tradeValidator.validateTradeExecution(agentId, walletAddress, tokenAddress);
      await expect(p).rejects.toThrow(TradeValidatorError);
      await expect(p).rejects.toThrow('Wallet not found or does not belong to agent');
    });

    it('should throw error when wallet does not belong to agent', async () => {
      // Arrange
      const config = createMockConfig();
      mockPrisma.agent.findUnique.mockResolvedValue({
        id: agentId,
        tradingMode: 'simulation',
      });
      mockConfigService.loadAgentConfig.mockResolvedValue(config);
      mockPrisma.agentWallet.findFirst.mockResolvedValue({
        walletAddress,
        walletType: 'simulation',
      });
      mockValidateWalletBelongsToAgent.mockResolvedValue(false);

      // Act & Assert (single call, two assertions)
      const p = tradeValidator.validateTradeExecution(agentId, walletAddress, tokenAddress);
      await expect(p).rejects.toThrow(TradeValidatorError);
      await expect(p).rejects.toThrow('Wallet does not belong to agent');
    });

    it('should throw error when live wallet is not loaded', async () => {
      // Arrange
      const config = createMockConfig();
      mockPrisma.agent.findUnique.mockResolvedValue({
        id: agentId,
        tradingMode: 'live',
      });
      mockConfigService.loadAgentConfig.mockResolvedValue(config);
      mockPrisma.agentWallet.findFirst.mockResolvedValue({
        walletAddress,
        walletType: 'live',
      });
      mockValidateWalletBelongsToAgent.mockResolvedValue(true);
      mockWalletStore.isWalletAvailable.mockReturnValue(false);
      mockWalletStore.getLoadedCount.mockReturnValue(0);
      mockWalletStore.getAllWalletAddresses.mockReturnValue([]);

      // Act & Assert (single call, two assertions)
      const p = tradeValidator.validateTradeExecution(agentId, walletAddress, tokenAddress);
      await expect(p).rejects.toThrow(TradeValidatorError);
      await expect(p).rejects.toThrow('Wallet not loaded from environment');
    });

    it('should throw error when trading mode mismatch', async () => {
      // Arrange
      const config = createMockConfig();
      mockPrisma.agent.findUnique.mockResolvedValue({
        id: agentId,
        tradingMode: 'simulation',
      });
      mockConfigService.loadAgentConfig.mockResolvedValue(config);
      mockPrisma.agentWallet.findFirst.mockResolvedValue({
        walletAddress,
        walletType: 'live', // Mismatch
      });
      mockValidateWalletBelongsToAgent.mockResolvedValue(true);
      mockWalletStore.isWalletAvailable.mockReturnValue(true);

      // Act & Assert (single call, two assertions)
      const p = tradeValidator.validateTradeExecution(agentId, walletAddress, tokenAddress);
      await expect(p).rejects.toThrow(TradeValidatorError);
      await expect(p).rejects.toThrow('Trading mode mismatch');
    });

    it('should throw error when balance is zero or negative', async () => {
      // Arrange
      const config = createMockConfig();
      mockPrisma.agent.findUnique.mockResolvedValue({
        id: agentId,
        tradingMode: 'simulation',
      });
      mockConfigService.loadAgentConfig.mockResolvedValue(config);
      mockPrisma.agentWallet.findFirst.mockResolvedValue({
        walletAddress,
        walletType: 'simulation',
      });
      mockValidateWalletBelongsToAgent.mockResolvedValue(true);
      // Mock getSolBalance to return 0
      mockRedisBalanceService.getBalance.mockResolvedValue(null);
      // Mock database fallback to return null (no balance record)
      mockPrisma.agentBalance.findUnique.mockResolvedValue(null);

      // Act & Assert (single call, two assertions)
      const p = tradeValidator.validateTradeExecution(agentId, walletAddress, tokenAddress);
      await expect(p).rejects.toThrow(TradeValidatorError);
      await expect(p).rejects.toThrow('Insufficient SOL balance');
    });

    it('should throw error when balance below minimum threshold', async () => {
      // Arrange
      const config = createMockConfig({
        purchaseLimits: {
          minimumAgentBalance: 1.0,
          maxPurchasePerToken: 5.0,
        },
      });
      mockPrisma.agent.findUnique.mockResolvedValue({
        id: agentId,
        tradingMode: 'simulation',
      });
      mockConfigService.loadAgentConfig.mockResolvedValue(config);
      mockPrisma.agentWallet.findFirst.mockResolvedValue({
        walletAddress,
        walletType: 'simulation',
      });
      mockValidateWalletBelongsToAgent.mockResolvedValue(true);
      // Mock balance below minimum (0.5 < 1.0)
      mockRedisBalanceService.getBalance.mockResolvedValue({
        balance: '0.5',
      });
      mockPositionService.getPositionByToken.mockResolvedValue(null);

      // Act & Assert (single call, two assertions)
      const p = tradeValidator.validateTradeExecution(agentId, walletAddress, tokenAddress);
      await expect(p).rejects.toThrow(TradeValidatorError);
      await expect(p).rejects.toThrow('Balance below minimum threshold');
    });

    it('should throw error when position already exists', async () => {
      // Arrange
      const config = createMockConfig();
      const existingPosition = {
        id: 'position-123',
        purchasePrice: 100,
        purchaseAmount: 1,
      };
      mockPrisma.agent.findUnique.mockResolvedValue({
        id: agentId,
        tradingMode: 'simulation',
      });
      mockConfigService.loadAgentConfig.mockResolvedValue(config);
      mockPrisma.agentWallet.findFirst.mockResolvedValue({
        walletAddress,
        walletType: 'simulation',
      });
      mockValidateWalletBelongsToAgent.mockResolvedValue(true);
      mockRedisBalanceService.getBalance.mockResolvedValue({
        balance: '10.0',
      });
      mockPositionService.getPositionByToken.mockResolvedValue(existingPosition);

      // Act & Assert (single call, two assertions)
      const p = tradeValidator.validateTradeExecution(agentId, walletAddress, tokenAddress);
      await expect(p).rejects.toThrow(TradeValidatorError);
      await expect(p).rejects.toThrow('Position already exists');
    });

    it('should validate position size when provided', async () => {
      // Arrange
      const config = createMockConfig({
        purchaseLimits: {
          minimumAgentBalance: 0.5,
          maxPurchasePerToken: 5.0,
        },
      });
      const positionSize = 2.0;
      const currentBalance = 10.0;
      
      mockPrisma.agent.findUnique.mockResolvedValue({
        id: agentId,
        tradingMode: 'simulation',
      });
      mockConfigService.loadAgentConfig.mockResolvedValue(config);
      mockPrisma.agentWallet.findFirst.mockResolvedValue({
        walletAddress,
        walletType: 'simulation',
      });
      mockValidateWalletBelongsToAgent.mockResolvedValue(true);
      mockRedisBalanceService.getBalance.mockResolvedValue({
        balance: currentBalance.toString(),
      });
      mockPositionService.getPositionByToken.mockResolvedValue(null);
      
      // Act
      const result = await tradeValidator.validateTradeExecution(
        agentId,
        walletAddress,
        tokenAddress,
        positionSize
      );
      
      // Assert
      expect(result.valid).toBe(true);
      expect(result.positionSize).toBe(positionSize);
      expect(result.currentSolBalance).toBe(currentBalance);
    });

    it('should throw error when position size is negative', async () => {
      // Arrange
      const config = createMockConfig();
      const positionSize = -1.0;

      mockPrisma.agent.findUnique.mockResolvedValue({
        id: agentId,
        tradingMode: 'simulation',
      });
      mockConfigService.loadAgentConfig.mockResolvedValue(config);
      mockPrisma.agentWallet.findFirst.mockResolvedValue({
        walletAddress,
        walletType: 'simulation',
      });
      mockValidateWalletBelongsToAgent.mockResolvedValue(true);
      mockRedisBalanceService.getBalance.mockResolvedValue({
        balance: '10.0',
      });
      mockPositionService.getPositionByToken.mockResolvedValue(null);

      // Act & Assert (single call, two assertions)
      const p = tradeValidator.validateTradeExecution(agentId, walletAddress, tokenAddress, positionSize);
      await expect(p).rejects.toThrow(TradeValidatorError);
      await expect(p).rejects.toThrow('Position size must be positive');
    });

    it('should throw error when position size exceeds balance', async () => {
      // Arrange
      const config = createMockConfig();
      const positionSize = 15.0;
      const currentBalance = 10.0;

      mockPrisma.agent.findUnique.mockResolvedValue({
        id: agentId,
        tradingMode: 'simulation',
      });
      mockConfigService.loadAgentConfig.mockResolvedValue(config);
      mockPrisma.agentWallet.findFirst.mockResolvedValue({
        walletAddress,
        walletType: 'simulation',
      });
      mockValidateWalletBelongsToAgent.mockResolvedValue(true);
      mockRedisBalanceService.getBalance.mockResolvedValue({
        balance: currentBalance.toString(),
      });
      mockPositionService.getPositionByToken.mockResolvedValue(null);

      // Act & Assert (single call, two assertions)
      const p = tradeValidator.validateTradeExecution(agentId, walletAddress, tokenAddress, positionSize);
      await expect(p).rejects.toThrow(TradeValidatorError);
      await expect(p).rejects.toThrow('Position size exceeds available balance');
    });

    it('should throw error when position size violates minimum balance', async () => {
      // Arrange
      const config = createMockConfig({
        purchaseLimits: {
          minimumAgentBalance: 5.0,
          maxPurchasePerToken: 10.0,
        },
      });
      const positionSize = 6.0; // Would leave only 4.0, below minimum of 5.0
      const currentBalance = 10.0;

      mockPrisma.agent.findUnique.mockResolvedValue({
        id: agentId,
        tradingMode: 'simulation',
      });
      mockConfigService.loadAgentConfig.mockResolvedValue(config);
      mockPrisma.agentWallet.findFirst.mockResolvedValue({
        walletAddress,
        walletType: 'simulation',
      });
      mockValidateWalletBelongsToAgent.mockResolvedValue(true);
      mockRedisBalanceService.getBalance.mockResolvedValue({
        balance: currentBalance.toString(),
      });
      mockPositionService.getPositionByToken.mockResolvedValue(null);

      // Act & Assert (single call, two assertions)
      const p = tradeValidator.validateTradeExecution(agentId, walletAddress, tokenAddress, positionSize);
      await expect(p).rejects.toThrow(TradeValidatorError);
      await expect(p).rejects.toThrow('Position size would violate minimum balance requirement');
    });

    it('should throw error when position size exceeds maxPurchasePerToken', async () => {
      // Arrange
      const config = createMockConfig({
        purchaseLimits: {
          minimumAgentBalance: 0.5,
          maxPurchasePerToken: 5.0,
        },
      });
      const positionSize = 6.0; // Exceeds max of 5.0
      const currentBalance = 10.0;

      mockPrisma.agent.findUnique.mockResolvedValue({
        id: agentId,
        tradingMode: 'simulation',
      });
      mockConfigService.loadAgentConfig.mockResolvedValue(config);
      mockPrisma.agentWallet.findFirst.mockResolvedValue({
        walletAddress,
        walletType: 'simulation',
      });
      mockValidateWalletBelongsToAgent.mockResolvedValue(true);
      mockRedisBalanceService.getBalance.mockResolvedValue({
        balance: currentBalance.toString(),
      });
      mockPositionService.getPositionByToken.mockResolvedValue(null);

      // Act & Assert (single call, two assertions)
      const p = tradeValidator.validateTradeExecution(agentId, walletAddress, tokenAddress, positionSize);
      await expect(p).rejects.toThrow(TradeValidatorError);
      await expect(p).rejects.toThrow('Position size exceeds maximum purchase per token');
    });

    it('should calculate position size when not provided', async () => {
      // Arrange
      const config = createMockConfig();
      const currentBalance = 10.0;
      const calculatedSize = 2.0;
      
      mockPrisma.agent.findUnique.mockResolvedValue({
        id: agentId,
        tradingMode: 'simulation',
      });
      mockConfigService.loadAgentConfig.mockResolvedValue(config);
      mockPrisma.agentWallet.findFirst.mockResolvedValue({
        walletAddress,
        walletType: 'simulation',
      });
      mockValidateWalletBelongsToAgent.mockResolvedValue(true);
      mockRedisBalanceService.getBalance.mockResolvedValue({
        balance: currentBalance.toString(),
      });
      mockPositionService.getPositionByToken.mockResolvedValue(null);
      mockPositionCalculator.calculatePositionSize.mockResolvedValue({
        size: calculatedSize,
      });
      
      // Act
      const result = await tradeValidator.validateTradeExecution(
        agentId,
        walletAddress,
        tokenAddress
      );
      
      // Assert
      expect(result.valid).toBe(true);
      expect(result.positionSize).toBe(calculatedSize);
      expect(result.currentSolBalance).toBe(currentBalance);
      expect(mockPositionCalculator.calculatePositionSize).toHaveBeenCalled();
    });
  });
});

