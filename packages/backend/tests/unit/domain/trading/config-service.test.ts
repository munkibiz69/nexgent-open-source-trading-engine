/**
 * Config Service Unit Tests
 * 
 * Tests configuration loading, merging, and validation logic.
 */

import { configService, ConfigServiceError } from '@/domain/trading/config-service.js';
import { DEFAULT_TRADING_CONFIG, type AgentTradingConfig } from '@nexgent/shared';
import { createMockConfig } from '../../../helpers/test-factory.js';

// Mock dependencies
jest.mock('@/infrastructure/database/client.js', () => ({
  prisma: {
    agent: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/infrastructure/cache/redis-config-service.js', () => ({
  redisConfigService: {
    getAgentConfig: jest.fn(),
    setAgentConfig: jest.fn(),
    invalidateAgentConfig: jest.fn(),
  },
}));

describe('ConfigService', () => {
  let mockPrisma: any;
  let mockRedisConfigService: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Get mocked services
    const prismaModule = await import('@/infrastructure/database/client.js');
    mockPrisma = prismaModule.prisma;
    
    const redisConfigServiceModule = await import('@/infrastructure/cache/redis-config-service.js');
    mockRedisConfigService = redisConfigServiceModule.redisConfigService;
  });

  describe('getDefaultConfig', () => {
    it('should return a copy of default config', () => {
      // Act
      const result = configService.getDefaultConfig();
      
      // Assert
      expect(result).toEqual(DEFAULT_TRADING_CONFIG);
      // Ensure it's a copy, not a reference
      expect(result).not.toBe(DEFAULT_TRADING_CONFIG);
    });

    it('should return independent copies on each call', () => {
      // Act
      const result1 = configService.getDefaultConfig();
      const result2 = configService.getDefaultConfig();
      
      // Assert
      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });
  });

  describe('mergeWithDefaults', () => {
    it('should return defaults when config is null', () => {
      // Act
      const result = configService.mergeWithDefaults(null);
      
      // Assert
      expect(result).toEqual(DEFAULT_TRADING_CONFIG);
    });

    it('should return defaults when config is undefined', () => {
      // Act
      const result = configService.mergeWithDefaults(undefined);
      
      // Assert
      expect(result).toEqual(DEFAULT_TRADING_CONFIG);
    });

    it('should return defaults when config is not an object', () => {
      // Act
      const result = configService.mergeWithDefaults('not an object');
      
      // Assert
      expect(result).toEqual(DEFAULT_TRADING_CONFIG);
    });

    it('should merge partial config with defaults', () => {
      // Arrange
      const partialConfig = {
        signals: {
          minScore: 5,
          allowedSignalTypes: ['buy'],
          tokenFilterMode: 'blacklist' as const,
          tokenList: ['Token123456789012345678901234567890'],
        },
      };
      
      // Act
      const result = configService.mergeWithDefaults(partialConfig);
      
      // Assert
      expect(result.signals.minScore).toBe(5);
      expect(result.signals.allowedSignalTypes).toEqual(['buy']);
      expect(result.signals.tokenFilterMode).toBe('blacklist');
      expect(result.signals.tokenList).toEqual(['Token123456789012345678901234567890']);
      expect(result.stopLoss.enabled).toBe(true); // From defaults
    });

    it('should deeply merge nested objects', () => {
      // Arrange
      const partialConfig = {
        purchaseLimits: {
          maxPurchasePerToken: 10,
        },
      };
      
      // Act
      const result = configService.mergeWithDefaults(partialConfig);
      
      // Assert
      expect(result.purchaseLimits.maxPurchasePerToken).toBe(10);
      expect(result.purchaseLimits.minimumAgentBalance).toBe(0.5); // From defaults
    });

    it('should replace arrays instead of merging', () => {
      // Arrange
      const partialConfig = {
        stopLoss: {
          trailingLevels: [
            { change: 50, stopLoss: 90 },
          ],
        },
      };
      
      // Act
      const result = configService.mergeWithDefaults(partialConfig);
      
      // Assert
      expect(result.stopLoss.trailingLevels).toHaveLength(1);
      expect(result.stopLoss.trailingLevels[0]).toEqual({ change: 50, stopLoss: 90 });
      // Should not include default trailing levels
    });
  });

  describe('mergeConfigs', () => {
    it('should merge partial config into existing config', () => {
      // Arrange
      const existing = createMockConfig({
        signals: {
          minScore: 3,
          allowedSignalTypes: ['buy'],
          tokenFilterMode: 'blacklist' as const,
          tokenList: ['Token123456789012345678901234567890'],
        },
      });
      // Only provide the field we want to update
      const partial = {
        signals: {
          minScore: 5,
        },
      } as Partial<AgentTradingConfig>;
      
      // Act
      const result = configService.mergeConfigs(existing, partial);
      
      // Assert
      expect(result.signals.minScore).toBe(5); // Updated
      expect(result.signals.tokenList).toEqual(['Token123456789012345678901234567890']); // Preserved
    });

    it('should deeply merge nested objects', () => {
      // Arrange
      const existing = createMockConfig({
        purchaseLimits: {
          minimumAgentBalance: 0.5,
          maxPurchasePerToken: 2.0,
        },
      });
      // Only provide the field we want to update
      const partial = {
        purchaseLimits: {
          maxPurchasePerToken: 5.0,
        },
      } as Partial<AgentTradingConfig>;
      
      // Act
      const result = configService.mergeConfigs(existing, partial);
      
      // Assert
      expect(result.purchaseLimits.maxPurchasePerToken).toBe(5.0); // Updated
      expect(result.purchaseLimits.minimumAgentBalance).toBe(0.5); // Preserved
    });

    it('should replace arrays instead of merging', () => {
      // Arrange
      const existing = createMockConfig({
        signals: {
          minScore: 1,
          allowedSignalTypes: [],
          tokenFilterMode: 'blacklist' as const,
          tokenList: ['Token111111111111111111111111111111', 'Token222222222222222222222222222222'],
        },
      });
      // Provide the array we want to replace
      const partial = {
        signals: {
          tokenList: ['Token333333333333333333333333333333'],
        },
      } as Partial<AgentTradingConfig>;
      
      // Act
      const result = configService.mergeConfigs(existing, partial);
      
      // Assert
      expect(result.signals.tokenList).toEqual(['Token333333333333333333333333333333']); // Replaced, not merged
    });

    it('should handle empty partial config', () => {
      // Arrange
      const existing = createMockConfig();
      const partial = {};
      
      // Act
      const result = configService.mergeConfigs(existing, partial);
      
      // Assert
      expect(result).toEqual(existing);
    });
  });

  describe('validateConfig', () => {
    it('should validate a valid config', () => {
      // Arrange - Use DEFAULT_TRADING_CONFIG which is guaranteed to be valid
      const config = DEFAULT_TRADING_CONFIG;
      
      // Act
      const result = configService.validateConfig(config);
      
      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject config with missing required fields', () => {
      // Arrange
      const config = {
        signals: {
          minScore: 3,
          // Missing allowedSignalTypes, tokenFilterMode, tokenList
        },
      };
      
      // Act
      const result = configService.validateConfig(config);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject config with invalid types', () => {
      // Arrange
      const config = {
        signals: {
          minScore: 'not a number', // Invalid type
          allowedSignalTypes: [],
          tokenFilterMode: 'none',
          tokenList: [],
        },
      };
      
      // Act
      const result = configService.validateConfig(config);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject config with invalid nested structure', () => {
      // Arrange
      const config = {
        stopLoss: {
          enabled: true,
          defaultPercentage: -32,
          trailingLevels: 'not an array', // Invalid type
        },
      };
      
      // Act
      const result = configService.validateConfig(config);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    // DCA Config Validation Tests
    it('should validate valid DCA config', () => {
      // Arrange - use DEFAULT_TRADING_CONFIG as base for complete valid config
      const config = {
        ...DEFAULT_TRADING_CONFIG,
        dca: {
          enabled: true,
          mode: 'moderate' as const,
          levels: [],
          maxDCACount: 3,
          cooldownSeconds: 30,
        },
      };
      
      // Act
      const result = configService.validateConfig(config);
      
      // Assert
      expect(result.valid).toBe(true);
    });

    it('should validate DCA config with custom levels', () => {
      // Arrange
      const config = {
        ...DEFAULT_TRADING_CONFIG,
        dca: {
          enabled: true,
          mode: 'custom' as const,
          levels: [
            { dropPercent: -15, buyPercent: 50 },
            { dropPercent: -30, buyPercent: 75 },
          ],
          maxDCACount: 5,
          cooldownSeconds: 60,
        },
      };
      
      // Act
      const result = configService.validateConfig(config);
      
      // Assert
      expect(result.valid).toBe(true);
    });

    it('should reject DCA config with invalid mode', () => {
      // Arrange
      const config = {
        ...DEFAULT_TRADING_CONFIG,
        dca: {
          enabled: true,
          mode: 'invalid_mode', // Invalid
          levels: [],
          maxDCACount: 3,
          cooldownSeconds: 30,
        },
      };
      
      // Act
      const result = configService.validateConfig(config);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject DCA config with maxDCACount less than 1', () => {
      // Arrange - minDCACount is 1, not 0
      const config = {
        ...DEFAULT_TRADING_CONFIG,
        dca: {
          enabled: true,
          mode: 'moderate' as const,
          levels: [],
          maxDCACount: 0, // Invalid - must be at least 1
          cooldownSeconds: 30,
        },
      };
      
      // Act
      const result = configService.validateConfig(config);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject DCA level with positive dropPercent', () => {
      // Arrange
      const config = {
        ...DEFAULT_TRADING_CONFIG,
        dca: {
          enabled: true,
          mode: 'custom' as const,
          levels: [
            { dropPercent: 15, buyPercent: 50 }, // Should be negative
          ],
          maxDCACount: 3,
          cooldownSeconds: 30,
        },
      };
      
      // Act
      const result = configService.validateConfig(config);
      
      // Assert
      expect(result.valid).toBe(false);
    });

    it('should reject DCA level with buyPercent less than 1', () => {
      // Arrange
      const config = {
        ...DEFAULT_TRADING_CONFIG,
        dca: {
          enabled: true,
          mode: 'custom' as const,
          levels: [
            { dropPercent: -15, buyPercent: 0 }, // Must be at least 1%
          ],
          maxDCACount: 3,
          cooldownSeconds: 30,
        },
      };
      
      // Act
      const result = configService.validateConfig(config);
      
      // Assert
      expect(result.valid).toBe(false);
    });

    it('should reject DCA config with cooldownSeconds less than 10', () => {
      // Arrange - min cooldown is 10 seconds
      const config = {
        ...DEFAULT_TRADING_CONFIG,
        dca: {
          enabled: true,
          mode: 'moderate' as const,
          levels: [],
          maxDCACount: 3,
          cooldownSeconds: 5, // Invalid - must be at least 10
        },
      };
      
      // Act
      const result = configService.validateConfig(config);
      
      // Assert
      expect(result.valid).toBe(false);
    });

    it('should validate disabled DCA config', () => {
      // Arrange
      const config = {
        ...DEFAULT_TRADING_CONFIG,
        dca: {
          enabled: false,
          mode: 'moderate' as const,
          levels: [],
          maxDCACount: 1,
          cooldownSeconds: 10,
        },
      };
      
      // Act
      const result = configService.validateConfig(config);
      
      // Assert
      expect(result.valid).toBe(true);
    });

    it('should reject DCA level with dropPercent above -1%', () => {
      // Arrange - dropPercent must be at most -1%
      const config = {
        ...DEFAULT_TRADING_CONFIG,
        dca: {
          enabled: true,
          mode: 'custom' as const,
          levels: [
            { dropPercent: -0.5, buyPercent: 50 }, // Must be at least -1%
          ],
          maxDCACount: 3,
          cooldownSeconds: 30,
        },
      };
      
      // Act
      const result = configService.validateConfig(config);
      
      // Assert
      expect(result.valid).toBe(false);
    });
  });

  describe('loadAgentConfig', () => {
    it('should return cached config if available', async () => {
      // Arrange
      const agentId = 'agent-123';
      const cachedConfig = createMockConfig();
      mockRedisConfigService.getAgentConfig.mockResolvedValue(cachedConfig);
      
      // Act
      const result = await configService.loadAgentConfig(agentId);
      
      // Assert
      expect(result).toEqual(cachedConfig);
      expect(mockRedisConfigService.getAgentConfig).toHaveBeenCalledWith(agentId);
      expect(mockPrisma.agent.findUnique).not.toHaveBeenCalled();
    });

    it('should load from database if not cached', async () => {
      // Arrange
      const agentId = 'agent-123';
      // Use a partial config that will be merged with defaults
      const dbConfig = {
        signals: {
          minScore: 5,
          allowedSignalTypes: [],
          tokenFilterMode: 'none' as const,
          tokenList: [],
        },
      };
      mockRedisConfigService.getAgentConfig.mockResolvedValue(null);
      mockPrisma.agent.findUnique.mockResolvedValue({
        tradingConfig: dbConfig,
      });
      mockRedisConfigService.setAgentConfig.mockResolvedValue(undefined);
      
      // Act
      const result = await configService.loadAgentConfig(agentId);
      
      // Assert
      expect(result.signals.minScore).toBe(5);
      expect(mockPrisma.agent.findUnique).toHaveBeenCalledWith({
        where: { id: agentId },
        select: { tradingConfig: true },
      });
      expect(mockRedisConfigService.setAgentConfig).toHaveBeenCalled();
    });

    it('should merge with defaults when database config is null', async () => {
      // Arrange
      const agentId = 'agent-123';
      mockRedisConfigService.getAgentConfig.mockResolvedValue(null);
      mockPrisma.agent.findUnique.mockResolvedValue({
        tradingConfig: null,
      });
      mockRedisConfigService.setAgentConfig.mockResolvedValue(undefined);
      
      // Act
      const result = await configService.loadAgentConfig(agentId);
      
      // Assert
      expect(result).toEqual(DEFAULT_TRADING_CONFIG);
    });

    it('should throw error when agent not found', async () => {
      // Arrange
      const agentId = 'non-existent';
      mockRedisConfigService.getAgentConfig.mockResolvedValue(null);
      mockPrisma.agent.findUnique.mockResolvedValue(null);
      
      // Act & Assert (single call, two assertions)
      const p = configService.loadAgentConfig(agentId);
      await expect(p).rejects.toThrow(ConfigServiceError);
      await expect(p).rejects.toThrow('Agent not found');
    });

    it('should throw error when config is invalid', async () => {
      // Arrange
      const agentId = 'agent-123';
      // Create a config that has invalid nested structure that can't be fixed by merging
      // Using a config that will merge but has invalid array items
      const invalidConfig = {
        stopLoss: {
          enabled: true,
          defaultPercentage: -32,
          trailingLevels: [
            { change: 'not a number', stopLoss: 90 }, // Invalid type in array
          ],
          mode: 'custom' as const,
        },
      };
      mockRedisConfigService.getAgentConfig.mockResolvedValue(null);
      mockPrisma.agent.findUnique.mockResolvedValue({
        tradingConfig: invalidConfig,
      });
      
      // Act & Assert (single call, two assertions)
      const p = configService.loadAgentConfig(agentId);
      await expect(p).rejects.toThrow(ConfigServiceError);
      await expect(p).rejects.toThrow('Invalid trading configuration');
    });
  });

  describe('saveAgentConfig', () => {
    it('should save valid config to database', async () => {
      // Arrange
      const agentId = 'agent-123';
      const config = DEFAULT_TRADING_CONFIG; // Use default config which is guaranteed valid
      mockPrisma.agent.findUnique.mockResolvedValue({ id: agentId });
      mockPrisma.agent.update.mockResolvedValue({});
      mockRedisConfigService.invalidateAgentConfig.mockResolvedValue(undefined);
      
      // Act
      await configService.saveAgentConfig(agentId, config);
      
      // Assert
      expect(mockPrisma.agent.update).toHaveBeenCalledWith({
        where: { id: agentId },
        data: {
          tradingConfig: config,
        },
      });
      expect(mockRedisConfigService.invalidateAgentConfig).toHaveBeenCalledWith(agentId);
    });

    it('should save null config to reset to defaults', async () => {
      // Arrange
      const agentId = 'agent-123';
      mockPrisma.agent.findUnique.mockResolvedValue({ id: agentId });
      mockPrisma.agent.update.mockResolvedValue({});
      mockRedisConfigService.invalidateAgentConfig.mockResolvedValue(undefined);
      
      // Act
      await configService.saveAgentConfig(agentId, null);
      
      // Assert
      expect(mockPrisma.agent.update).toHaveBeenCalled();
      expect(mockRedisConfigService.invalidateAgentConfig).toHaveBeenCalledWith(agentId);
    });

    it('should throw error when agent not found', async () => {
      // Arrange
      const agentId = 'non-existent';
      const config = DEFAULT_TRADING_CONFIG; // Use default config which is guaranteed valid
      mockPrisma.agent.findUnique.mockResolvedValue(null);
      
      // Act & Assert (single call, two assertions)
      const p = configService.saveAgentConfig(agentId, config);
      await expect(p).rejects.toThrow(ConfigServiceError);
      await expect(p).rejects.toThrow('Agent not found');
    });

    it('should throw error when config is invalid', async () => {
      // Arrange
      const agentId = 'agent-123';
      const invalidConfig = { invalid: 'config' } as any;
      mockPrisma.agent.findUnique.mockResolvedValue({ id: agentId });
      
      // Act & Assert (single call, two assertions)
      const p = configService.saveAgentConfig(agentId, invalidConfig);
      await expect(p).rejects.toThrow(ConfigServiceError);
      await expect(p).rejects.toThrow('Invalid trading configuration');
    });
  });
});

