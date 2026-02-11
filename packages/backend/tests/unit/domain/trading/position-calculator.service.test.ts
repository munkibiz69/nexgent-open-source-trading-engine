/**
 * Position Calculator Service Unit Tests
 * 
 * Tests position size calculation logic.
 */

// Jest globals are available without import
import { positionCalculator, PositionCalculatorError } from '@/domain/trading/position-calculator.service.js';
import { createMockConfig } from '../../../helpers/test-factory.js';

// Mock dependencies
jest.mock('@/domain/trading/config-service.js', () => ({
  configService: {
    loadAgentConfig: jest.fn(),
  },
}));

describe('PositionCalculator', () => {
  let mockConfigService: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Get mocked config service
    const configServiceModule = await import('@/domain/trading/config-service.js');
    mockConfigService = configServiceModule.configService;
  });

  describe('calculatePositionSize', () => {
    it('should calculate small position size when balance is in small range', async () => {
      // Arrange
      const agentId = 'agent-123';
      const walletAddress = 'wallet-123';
      const currentSolBalance = 0.5; // Small range
      const config = createMockConfig({
        positionCalculator: {
          solBalanceThresholds: { minimum: 0.1, medium: 1, large: 10 },
          positionSizes: {
            small: { min: 0.1, max: 0.5 },
            medium: { min: 0.5, max: 2 },
            large: { min: 2, max: 10 },
          },
          randomization: { enabled: false },
        },
        purchaseLimits: {
          maxPurchasePerToken: 5,
          minimumAgentBalance: 0.05, // Lower minimum to allow full 0.5
        },
      });
      
      // Act
      const result = await positionCalculator.calculatePositionSize(
        agentId,
        walletAddress,
        currentSolBalance,
        config
      );
      
      // Assert
      expect(result.category).toBe('small');
      // With balance 0.5 and minimum 0.05, position = 0.5 - 0.05 = 0.45, but max is 0.5, so result is 0.45
      // Actually, the code uses max first (0.5), then adjusts for minimum (0.5 - 0.05 = 0.45)
      expect(result.size).toBeCloseTo(0.45, 2);
      expect(result.randomized).toBe(false);
    });

    it('should calculate medium position size when balance is in medium range', async () => {
      // Arrange
      const agentId = 'agent-123';
      const walletAddress = 'wallet-123';
      const currentSolBalance = 5; // Medium range
      const config = createMockConfig({
        positionCalculator: {
          solBalanceThresholds: { minimum: 0.1, medium: 1, large: 10 },
          positionSizes: {
            small: { min: 0.1, max: 0.5 },
            medium: { min: 0.5, max: 2 },
            large: { min: 2, max: 10 },
          },
          randomization: { enabled: false },
        },
      });
      
      // Act
      const result = await positionCalculator.calculatePositionSize(
        agentId,
        walletAddress,
        currentSolBalance,
        config
      );
      
      // Assert
      expect(result.category).toBe('medium');
      expect(result.size).toBe(2); // Max for medium
      expect(result.randomized).toBe(false);
    });

    it('should calculate large position size when balance is in large range', async () => {
      // Arrange
      const agentId = 'agent-123';
      const walletAddress = 'wallet-123';
      const currentSolBalance = 20; // Large range
      const config = createMockConfig({
        positionCalculator: {
          solBalanceThresholds: { minimum: 0.1, medium: 1, large: 10 },
          positionSizes: {
            small: { min: 0.1, max: 0.5 },
            medium: { min: 0.5, max: 2 },
            large: { min: 2, max: 10 },
          },
          randomization: { enabled: false },
        },
        purchaseLimits: {
          maxPurchasePerToken: 15, // Higher than large max to allow full 10
          minimumAgentBalance: 0.1,
        },
      });
      
      // Act
      const result = await positionCalculator.calculatePositionSize(
        agentId,
        walletAddress,
        currentSolBalance,
        config
      );
      
      // Assert
      expect(result.category).toBe('large');
      expect(result.size).toBe(10); // Max for large (20 - 0.1 = 19.9, but capped at max 10)
      expect(result.randomized).toBe(false);
    });

    it('should apply randomization when enabled', async () => {
      // Arrange
      const agentId = 'agent-123';
      const walletAddress = 'wallet-123';
      const currentSolBalance = 5;
      const config = createMockConfig({
        positionCalculator: {
          solBalanceThresholds: { minimum: 0.1, medium: 1, large: 10 },
          positionSizes: {
            small: { min: 0.1, max: 0.5 },
            medium: { min: 0.5, max: 2 },
            large: { min: 2, max: 10 },
          },
          randomization: { enabled: true },
        },
      });
      
      // Act
      const result = await positionCalculator.calculatePositionSize(
        agentId,
        walletAddress,
        currentSolBalance,
        config
      );
      
      // Assert
      expect(result.category).toBe('medium');
      expect(result.size).toBeGreaterThanOrEqual(0.5);
      expect(result.size).toBeLessThanOrEqual(2);
      expect(result.randomized).toBe(true);
    });

    it('should respect maxPurchasePerToken limit', async () => {
      // Arrange
      const agentId = 'agent-123';
      const walletAddress = 'wallet-123';
      const currentSolBalance = 20;
      const config = createMockConfig({
        positionCalculator: {
          solBalanceThresholds: { minimum: 0.1, medium: 1, large: 10 },
          positionSizes: {
            small: { min: 0.1, max: 0.5 },
            medium: { min: 0.5, max: 2 },
            large: { min: 2, max: 10 },
          },
          randomization: { enabled: false },
        },
        purchaseLimits: {
          maxPurchasePerToken: 5, // Less than large max
          minimumAgentBalance: 0.1,
        },
      });
      
      // Act
      const result = await positionCalculator.calculatePositionSize(
        agentId,
        walletAddress,
        currentSolBalance,
        config
      );
      
      // Assert
      expect(result.size).toBe(5); // Capped at maxPurchasePerToken
    });

    it('should adjust position size to maintain minimumAgentBalance', async () => {
      // Arrange
      const agentId = 'agent-123';
      const walletAddress = 'wallet-123';
      const currentSolBalance = 2.5; // Would use 2 SOL, leaving 0.5
      const config = createMockConfig({
        positionCalculator: {
          solBalanceThresholds: { minimum: 0.1, medium: 1, large: 10 },
          positionSizes: {
            small: { min: 0.1, max: 0.5 },
            medium: { min: 0.5, max: 2 },
            large: { min: 2, max: 10 },
          },
          randomization: { enabled: false },
        },
        purchaseLimits: {
          maxPurchasePerToken: 10,
          minimumAgentBalance: 1, // Need to keep 1 SOL
        },
      });
      
      // Act
      const result = await positionCalculator.calculatePositionSize(
        agentId,
        walletAddress,
        currentSolBalance,
        config
      );
      
      // Assert
      expect(result.size).toBe(1.5); // 2.5 - 1 = 1.5
    });

    it('should throw error when balance is zero or negative', async () => {
      // Arrange
      const agentId = 'agent-123';
      const walletAddress = 'wallet-123';
      const currentSolBalance = 0;
      const config = createMockConfig();
      
      // Act & Assert (single call, two assertions)
      const p = positionCalculator.calculatePositionSize(agentId, walletAddress, currentSolBalance, config);
      await expect(p).rejects.toThrow(PositionCalculatorError);
      await expect(p).rejects.toThrow('SOL balance must be positive');
    });

    it('should throw error when balance is below minimum threshold', async () => {
      // Arrange
      const agentId = 'agent-123';
      const walletAddress = 'wallet-123';
      const currentSolBalance = 0.05; // Below minimum
      const config = createMockConfig({
        positionCalculator: {
          solBalanceThresholds: { minimum: 0.1, medium: 1, large: 10 },
          positionSizes: {
            small: { min: 0.1, max: 0.5 },
            medium: { min: 0.5, max: 2 },
            large: { min: 2, max: 10 },
          },
          randomization: { enabled: false },
        },
      });
      
      // Act & Assert (single call, two assertions)
      const p = positionCalculator.calculatePositionSize(agentId, walletAddress, currentSolBalance, config);
      await expect(p).rejects.toThrow(PositionCalculatorError);
      await expect(p).rejects.toThrow('Balance below minimum threshold');
    });

    it('should throw error when cannot maintain minimum balance', async () => {
      // Arrange
      const agentId = 'agent-123';
      const walletAddress = 'wallet-123';
      const currentSolBalance = 0.5; // Would use 0.5, but need to keep 0.5 minimum
      const config = createMockConfig({
        positionCalculator: {
          solBalanceThresholds: { minimum: 0.1, medium: 1, large: 10 },
          positionSizes: {
            small: { min: 0.1, max: 0.5 },
            medium: { min: 0.5, max: 2 },
            large: { min: 2, max: 10 },
          },
          randomization: { enabled: false },
        },
        purchaseLimits: {
          maxPurchasePerToken: 10,
          minimumAgentBalance: 0.5, // Need to keep 0.5
        },
      });
      
      // Act & Assert (single call, two assertions)
      const p = positionCalculator.calculatePositionSize(agentId, walletAddress, currentSolBalance, config);
      await expect(p).rejects.toThrow(PositionCalculatorError);
      await expect(p).rejects.toThrow('Cannot maintain minimum balance');
    });

    it('should load config if not provided', async () => {
      // Arrange
      const agentId = 'agent-123';
      const walletAddress = 'wallet-123';
      const currentSolBalance = 5;
      const config = createMockConfig();
      
      mockConfigService.loadAgentConfig.mockResolvedValue(config);
      
      // Act
      await positionCalculator.calculatePositionSize(agentId, walletAddress, currentSolBalance);
      
      // Assert
      expect(mockConfigService.loadAgentConfig).toHaveBeenCalledWith(agentId);
    });
  });

  describe('getSolBalance', () => {
    it('should extract SOL balance from balances array', () => {
      // Arrange
      const balances = [
        { tokenAddress: 'Token1', balance: '100' },
        { tokenAddress: 'So11111111111111111111111111111111111111112', balance: '5.5' },
        { tokenAddress: 'Token2', balance: '200' },
      ];
      
      // Act
      const result = (positionCalculator as any).getSolBalance(balances);
      
      // Assert
      expect(result).toBe(5.5);
    });

    it('should return 0 when SOL balance not found', () => {
      // Arrange
      const balances = [
        { tokenAddress: 'Token1', balance: '100' },
        { tokenAddress: 'Token2', balance: '200' },
      ];
      
      // Act
      const result = (positionCalculator as any).getSolBalance(balances);
      
      // Assert
      expect(result).toBe(0);
    });

    it('should convert lamports to SOL when balance is very large', () => {
      // Arrange
      const balances = [
        { tokenAddress: 'So11111111111111111111111111111111111111112', balance: '5000000000' }, // 5 SOL in lamports
      ];
      
      // Act
      const result = (positionCalculator as any).getSolBalance(balances);
      
      // Assert
      expect(result).toBe(5); // Converted from lamports
    });

    it('should handle empty balances array', () => {
      // Arrange
      const balances: Array<{ tokenAddress: string; balance: string }> = [];
      
      // Act
      const result = (positionCalculator as any).getSolBalance(balances);
      
      // Assert
      expect(result).toBe(0);
    });
  });
});
