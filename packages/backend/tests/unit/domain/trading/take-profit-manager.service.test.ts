/**
 * Take-Profit Manager Service Unit Tests
 * 
 * Tests the take-profit evaluation and management logic.
 */

import { takeProfitManager } from '@/domain/trading/take-profit-manager.service.js';
import {
  createMockConfig,
  createMockPosition,
} from '../../../helpers/test-factory.js';
import type { AgentTradingConfig, TakeProfitConfig, OpenPosition } from '@nexgent/shared';

// Mock logger - must be before other mocks to avoid reference errors
jest.mock('@/infrastructure/logging/logger.js', () => {
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  };
  return {
    __esModule: true,
    default: mockLogger,
    logger: mockLogger,
  };
});

// Mock dependencies
jest.mock('@/domain/trading/config-service.js', () => ({
  configService: {
    loadAgentConfig: jest.fn(),
  },
}));

jest.mock('@/domain/trading/position-service.js', () => ({
  positionService: {
    getPositionById: jest.fn(),
  },
}));

jest.mock('@/infrastructure/cache/redis-config-service.js', () => ({
  redisConfigService: {
    getAgentConfig: jest.fn(),
  },
}));

jest.mock('@/infrastructure/cache/redis-client.js', () => ({
  redisService: {
    acquireLock: jest.fn().mockResolvedValue('mock-lock-token'),
    releaseLock: jest.fn().mockResolvedValue(undefined),
    getClient: jest.fn(),
  },
}));

/**
 * Helper to create a mock take-profit config
 */
function createMockTakeProfitConfig(overrides: Partial<TakeProfitConfig> = {}): TakeProfitConfig {
  return {
    enabled: true,
    mode: 'custom' as const,
    levels: [
      { targetPercent: 50, sellPercent: 25 },
      { targetPercent: 150, sellPercent: 25 },
      { targetPercent: 300, sellPercent: 25 },
      { targetPercent: 400, sellPercent: 15 },
    ],
    moonBag: {
      enabled: true,
      triggerPercent: 300,
      retainPercent: 10,
    },
    ...overrides,
  };
}

/**
 * Helper to create a mock position for take-profit testing
 */
function createMockPositionForTakeProfit(overrides: Partial<OpenPosition> = {}): OpenPosition {
  return createMockPosition({
    purchasePrice: 0.001, // SOL per token
    purchaseAmount: 1000, // tokens
    totalInvestedSol: 1.0, // 1000 * 0.001 = 1 SOL
    remainingAmount: null, // Fresh position
    takeProfitLevelsHit: 0,
    takeProfitTransactionIds: [],
    lastTakeProfitTime: null,
    moonBagActivated: false,
    moonBagAmount: null,
    ...overrides,
  });
}

describe('TakeProfitManager', () => {
  let mockConfig: AgentTradingConfig;
  let mockPositionService: any;
  let mockConfigService: any;
  let mockRedisConfigService: any;
  let mockRedisService: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock config with take-profit enabled
    mockConfig = createMockConfig({
      takeProfit: createMockTakeProfitConfig(),
      dca: { enabled: false, mode: 'moderate', levels: [], maxDCACount: 3, cooldownSeconds: 30 },
    });

    // Get mocked services
    const positionServiceModule = await import('@/domain/trading/position-service.js');
    mockPositionService = positionServiceModule.positionService;

    const configServiceModule = await import('@/domain/trading/config-service.js');
    mockConfigService = configServiceModule.configService;

    const redisConfigServiceModule = await import('@/infrastructure/cache/redis-config-service.js');
    mockRedisConfigService = redisConfigServiceModule.redisConfigService;

    const redisClientModule = await import('@/infrastructure/cache/redis-client.js');
    mockRedisService = redisClientModule.redisService;

    // Setup default mocks
    mockRedisConfigService.getAgentConfig.mockResolvedValue(mockConfig);
    mockConfigService.loadAgentConfig.mockResolvedValue(mockConfig);
    mockRedisService.acquireLock.mockResolvedValue('mock-lock-token');
    mockRedisService.releaseLock.mockResolvedValue(undefined);
  });

  describe('evaluateTakeProfit', () => {
    describe('lock handling', () => {
      it('should return early when lock cannot be acquired', async () => {
        // Arrange
        mockRedisService.acquireLock.mockResolvedValue(null);
        const position = createMockPositionForTakeProfit();
        const currentPrice = 0.002; // 100% gain

        // Act
        const result = await takeProfitManager.evaluateTakeProfit(position, currentPrice, mockConfig);

        // Assert
        expect(result.shouldExecute).toBe(false);
        expect(result.reason).toContain('Lock not acquired');
      });

      it('should release lock after evaluation', async () => {
        // Arrange
        const position = createMockPositionForTakeProfit();
        mockPositionService.getPositionById.mockResolvedValue(position);
        const currentPrice = 0.0012; // 20% gain (below first level)

        // Act
        await takeProfitManager.evaluateTakeProfit(position, currentPrice, mockConfig);

        // Assert
        expect(mockRedisService.releaseLock).toHaveBeenCalled();
      });
    });

    describe('basic checks', () => {
      it('should return no trigger when take-profit is disabled', async () => {
        // Arrange
        const position = createMockPositionForTakeProfit();
        mockPositionService.getPositionById.mockResolvedValue(position);
        const currentPrice = 0.002; // 100% gain
        const config = createMockConfig({
          takeProfit: createMockTakeProfitConfig({ enabled: false }),
        });

        // Act
        const result = await takeProfitManager.evaluateTakeProfit(position, currentPrice, config);

        // Assert
        expect(result.shouldExecute).toBe(false);
        expect(result.reason).toContain('disabled');
      });

      it('should evaluate normally when DCA is also enabled (no longer mutually exclusive)', async () => {
        // Arrange
        const position = createMockPositionForTakeProfit();
        mockPositionService.getPositionById.mockResolvedValue(position);
        const currentPrice = 0.0015; // 50% gain - triggers first TP level
        const config = createMockConfig({
          takeProfit: createMockTakeProfitConfig({ enabled: true }),
          dca: { enabled: true, mode: 'moderate', levels: [], maxDCACount: 3, cooldownSeconds: 30 },
        });

        // Act
        const result = await takeProfitManager.evaluateTakeProfit(position, currentPrice, config);

        // Assert - should trigger TP even with DCA enabled
        expect(result.shouldExecute).toBe(true);
        expect(result.levelsToExecute).toHaveLength(1);
        expect(result.levelsToExecute[0].targetPercent).toBe(50);
      });

      it('should return no trigger when position is not found', async () => {
        // Arrange
        const position = createMockPositionForTakeProfit();
        mockPositionService.getPositionById.mockResolvedValue(null);
        const currentPrice = 0.002;

        // Act
        const result = await takeProfitManager.evaluateTakeProfit(position, currentPrice, mockConfig);

        // Assert
        expect(result.shouldExecute).toBe(false);
        expect(result.reason).toContain('not found');
      });

      it('should return no trigger when purchase price is invalid', async () => {
        // Arrange
        const position = createMockPositionForTakeProfit({ purchasePrice: 0 });
        mockPositionService.getPositionById.mockResolvedValue(position);
        const currentPrice = 0.002;

        // Act
        const result = await takeProfitManager.evaluateTakeProfit(position, currentPrice, mockConfig);

        // Assert
        expect(result.shouldExecute).toBe(false);
        expect(result.reason).toContain('Invalid purchase price');
      });
    });

    describe('level triggering', () => {
      it('should not trigger when price is below first level', async () => {
        // Arrange
        const position = createMockPositionForTakeProfit();
        mockPositionService.getPositionById.mockResolvedValue(position);
        const currentPrice = 0.0012; // 20% gain (below 50% level)

        // Act
        const result = await takeProfitManager.evaluateTakeProfit(position, currentPrice, mockConfig);

        // Assert
        expect(result.shouldExecute).toBe(false);
        expect(result.gainPercent).toBeCloseTo(20, 1);
      });

      it('should trigger first level when price reaches target', async () => {
        // Arrange
        const position = createMockPositionForTakeProfit();
        mockPositionService.getPositionById.mockResolvedValue(position);
        const currentPrice = 0.0015; // 50% gain

        // Act
        const result = await takeProfitManager.evaluateTakeProfit(position, currentPrice, mockConfig);

        // Assert
        expect(result.shouldExecute).toBe(true);
        expect(result.levelsToExecute).toHaveLength(1);
        expect(result.levelsToExecute[0].targetPercent).toBe(50);
        expect(result.sellAmount).toBe(250); // 25% of 1000
        expect(result.gainPercent).toBeCloseTo(50, 1);
      });

      it('should trigger multiple levels when price jumps', async () => {
        // Arrange
        const position = createMockPositionForTakeProfit();
        mockPositionService.getPositionById.mockResolvedValue(position);
        const currentPrice = 0.0026; // 160% gain (triggers level 1 and 2)

        // Act
        const result = await takeProfitManager.evaluateTakeProfit(position, currentPrice, mockConfig);

        // Assert
        expect(result.shouldExecute).toBe(true);
        expect(result.levelsToExecute).toHaveLength(2);
        expect(result.sellAmount).toBe(500); // 25% + 25% = 50% of 1000
        expect(result.gainPercent).toBeCloseTo(160, 1);
      });

      it('should skip already-hit levels', async () => {
        // Arrange
        const position = createMockPositionForTakeProfit({
          takeProfitLevelsHit: 2, // Levels 1 and 2 already hit
          remainingAmount: 500, // 50% remaining
        });
        mockPositionService.getPositionById.mockResolvedValue(position);
        const currentPrice = 0.004; // 300% gain

        // Act
        const result = await takeProfitManager.evaluateTakeProfit(position, currentPrice, mockConfig);

        // Assert
        expect(result.shouldExecute).toBe(true);
        expect(result.levelsToExecute).toHaveLength(1);
        expect(result.levelsToExecute[0].targetPercent).toBe(300);
      });

      it('should not trigger when all levels exhausted', async () => {
        // Arrange
        const position = createMockPositionForTakeProfit({
          takeProfitLevelsHit: 4, // All 4 levels hit
          remainingAmount: 100, // Moon bag only
          moonBagActivated: true,
          moonBagAmount: 100,
        });
        mockPositionService.getPositionById.mockResolvedValue(position);
        const currentPrice = 0.006; // 500% gain

        // Act
        const result = await takeProfitManager.evaluateTakeProfit(position, currentPrice, mockConfig);

        // Assert
        expect(result.shouldExecute).toBe(false);
        expect(result.reason).toContain('exhausted');
      });
    });

    describe('moon bag handling', () => {
      it('should activate moon bag when trigger threshold reached', async () => {
        // Arrange
        const position = createMockPositionForTakeProfit({
          takeProfitLevelsHit: 2,
          remainingAmount: 500,
        });
        mockPositionService.getPositionById.mockResolvedValue(position);
        const currentPrice = 0.004; // 300% gain (moon bag trigger)

        // Act
        const result = await takeProfitManager.evaluateTakeProfit(position, currentPrice, mockConfig);

        // Assert
        expect(result.activateMoonBag).toBe(true);
        expect(result.moonBagAmount).toBe(100); // 10% of 1000 (original)
      });

      it('should activate moon bag when approaching final level', async () => {
        // Arrange: Moon bag trigger is 300%, but we're hitting the final level at 400%
        // Even if moon bag trigger was higher, it should activate before final level
        const config = createMockConfig({
          takeProfit: createMockTakeProfitConfig({
            moonBag: {
              enabled: true,
              triggerPercent: 500, // Higher than any level
              retainPercent: 10,
            },
          }),
        });
        const position = createMockPositionForTakeProfit({
          takeProfitLevelsHit: 3, // 3 levels hit
          remainingAmount: 250,
        });
        mockPositionService.getPositionById.mockResolvedValue(position);
        const currentPrice = 0.005; // 400% gain (final level)

        // Act
        const result = await takeProfitManager.evaluateTakeProfit(position, currentPrice, config);

        // Assert
        expect(result.activateMoonBag).toBe(true);
      });

      it('should not re-activate already activated moon bag', async () => {
        // Arrange
        const position = createMockPositionForTakeProfit({
          takeProfitLevelsHit: 3,
          remainingAmount: 250,
          moonBagActivated: true,
          moonBagAmount: 100,
        });
        mockPositionService.getPositionById.mockResolvedValue(position);
        const currentPrice = 0.005; // 400% gain

        // Act
        const result = await takeProfitManager.evaluateTakeProfit(position, currentPrice, mockConfig);

        // Assert
        expect(result.activateMoonBag).toBe(false);
        expect(result.moonBagAmount).toBe(0);
      });
    });

    describe('config loading', () => {
      it('should load config from Redis if not provided', async () => {
        // Arrange
        const position = createMockPositionForTakeProfit();
        mockPositionService.getPositionById.mockResolvedValue(position);
        const currentPrice = 0.0015;

        // Act
        await takeProfitManager.evaluateTakeProfit(position, currentPrice); // No config passed

        // Assert
        expect(mockRedisConfigService.getAgentConfig).toHaveBeenCalledWith(position.agentId);
      });

      it('should fallback to DB config if Redis cache miss', async () => {
        // Arrange
        const position = createMockPositionForTakeProfit();
        mockPositionService.getPositionById.mockResolvedValue(position);
        mockRedisConfigService.getAgentConfig.mockResolvedValue(null); // Cache miss
        const currentPrice = 0.0015;

        // Act
        await takeProfitManager.evaluateTakeProfit(position, currentPrice);

        // Assert
        expect(mockConfigService.loadAgentConfig).toHaveBeenCalledWith(position.agentId);
      });
    });
  });

  describe('getEffectiveRemainingAmount', () => {
    it('should return remainingAmount when set', () => {
      const position = createMockPositionForTakeProfit({ remainingAmount: 500 });
      expect(takeProfitManager.getEffectiveRemainingAmount(position)).toBe(500);
    });

    it('should return purchaseAmount when remainingAmount is null', () => {
      const position = createMockPositionForTakeProfit({ remainingAmount: null });
      expect(takeProfitManager.getEffectiveRemainingAmount(position)).toBe(1000);
    });
  });

  describe('isOnlyMoonBag', () => {
    it('should return false when moon bag not activated', () => {
      const position = createMockPositionForTakeProfit({
        moonBagActivated: false,
        remainingAmount: 100,
      });
      expect(takeProfitManager.isOnlyMoonBag(position)).toBe(false);
    });

    it('should return false when moon bag amount is null', () => {
      const position = createMockPositionForTakeProfit({
        moonBagActivated: true,
        moonBagAmount: null,
        remainingAmount: 100,
      });
      expect(takeProfitManager.isOnlyMoonBag(position)).toBe(false);
    });

    it('should return true when remaining equals moon bag amount', () => {
      const position = createMockPositionForTakeProfit({
        moonBagActivated: true,
        moonBagAmount: 100,
        remainingAmount: 100,
      });
      expect(takeProfitManager.isOnlyMoonBag(position)).toBe(true);
    });

    it('should return false when remaining differs from moon bag amount', () => {
      const position = createMockPositionForTakeProfit({
        moonBagActivated: true,
        moonBagAmount: 100,
        remainingAmount: 250,
      });
      expect(takeProfitManager.isOnlyMoonBag(position)).toBe(false);
    });
  });

  describe('calculateProgress', () => {
    it('should calculate progress correctly', () => {
      const position = createMockPositionForTakeProfit({
        purchaseAmount: 1000,
        remainingAmount: 500,
        takeProfitLevelsHit: 2,
        moonBagActivated: false,
      });

      const result = takeProfitManager.calculateProgress(position, mockConfig);

      expect(result.levelsHit).toBe(2);
      expect(result.totalLevels).toBe(4);
      expect(result.percentComplete).toBe(50);
      expect(result.soldAmount).toBe(500);
      expect(result.remainingAmount).toBe(500);
      expect(result.moonBagAmount).toBeNull();
    });

    it('should include moon bag amount when activated', () => {
      const position = createMockPositionForTakeProfit({
        purchaseAmount: 1000,
        remainingAmount: 100,
        takeProfitLevelsHit: 4,
        moonBagActivated: true,
        moonBagAmount: 100,
      });

      const result = takeProfitManager.calculateProgress(position, mockConfig);

      expect(result.levelsHit).toBe(4);
      expect(result.percentComplete).toBe(100);
      expect(result.moonBagAmount).toBe(100);
    });

    it('should handle empty levels array', () => {
      const position = createMockPositionForTakeProfit();
      const config = createMockConfig({
        takeProfit: createMockTakeProfitConfig({ levels: [] }),
      });

      const result = takeProfitManager.calculateProgress(position, config);

      expect(result.totalLevels).toBe(0);
      expect(result.percentComplete).toBe(0);
    });
  });
});
