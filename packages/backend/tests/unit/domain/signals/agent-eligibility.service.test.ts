/**
 * Agent Eligibility Service Unit Tests
 * 
 * Tests agent eligibility checking logic for trading signals.
 */

// Jest globals are available without import
import { agentEligibilityService } from '@/domain/signals/agent-eligibility.service.js';
import { createMockSignal, createMockConfig } from '../../../helpers/test-factory.js';

// Mock dependencies
jest.mock('@/infrastructure/cache/redis-agent-service.js', () => ({
  redisAgentService: {
    getActiveAgentIds: jest.fn(),
    isAutomatedTradingEnabled: jest.fn().mockResolvedValue(true), // Default: enabled
  },
}));

jest.mock('@/infrastructure/cache/redis-config-service.js', () => ({
  redisConfigService: {
    getAgentConfig: jest.fn(),
  },
}));

jest.mock('@/infrastructure/database/client.js', () => ({
  prisma: {
    agent: {
      findMany: jest.fn(),
    },
  },
}));

describe('AgentEligibilityService', () => {
  let mockRedisAgentService: any;
  let mockRedisConfigService: any;
  let mockPrisma: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrisma = (await import('@/infrastructure/database/client.js')).prisma;

    // Get mocked services
    const redisAgentServiceModule = await import('@/infrastructure/cache/redis-agent-service.js');
    mockRedisAgentService = redisAgentServiceModule.redisAgentService;

    const redisConfigServiceModule = await import('@/infrastructure/cache/redis-config-service.js');
    mockRedisConfigService = redisConfigServiceModule.redisConfigService;

    // Default: active agents and user-scoped agents (service filters by signal.userId)
    const defaultAgentIds = ['agent-1', 'agent-2', 'agent-3'];
    mockRedisAgentService.getActiveAgentIds.mockResolvedValue(defaultAgentIds);
    mockPrisma.agent.findMany.mockResolvedValue(defaultAgentIds.map((id) => ({ id })));
  });

  describe('getEligibleAgents', () => {
    it('should return all agents when all are eligible', async () => {
      // Arrange
      const signal = createMockSignal({ signalStrength: 5 });
      const config = createMockConfig({
        signals: {
          minScore: 1,
          allowedSignalTypes: [],
          tokenFilterMode: 'none',
          tokenList: [],
        },
      });
      
      mockRedisConfigService.getAgentConfig.mockResolvedValue(config);
      
      // Act
      const result = await agentEligibilityService.getEligibleAgents(signal, null);
      
      // Assert
      expect(result).toHaveLength(3);
      expect(result).toContain('agent-1');
      expect(result).toContain('agent-2');
      expect(result).toContain('agent-3');
    });

    it('should filter agents with insufficient signal strength', async () => {
      // Arrange
      const signal = createMockSignal({ signalStrength: 3 });
      const config1 = createMockConfig({
        signals: { minScore: 5, allowedSignalTypes: [], tokenFilterMode: 'none', tokenList: [] },
      }); // Too high
      const config2 = createMockConfig({
        signals: { minScore: 1, allowedSignalTypes: [], tokenFilterMode: 'none', tokenList: [] },
      }); // OK
      const config3 = createMockConfig({
        signals: { minScore: 2, allowedSignalTypes: [], tokenFilterMode: 'none', tokenList: [] },
      }); // OK
      
      mockRedisConfigService.getAgentConfig
        .mockResolvedValueOnce(config1) // agent-1: not eligible
        .mockResolvedValueOnce(config2) // agent-2: eligible
        .mockResolvedValueOnce(config3); // agent-3: eligible
      
      // Act
      const result = await agentEligibilityService.getEligibleAgents(signal, null);
      
      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContain('agent-2');
      expect(result).toContain('agent-3');
      expect(result).not.toContain('agent-1');
    });

    it('should filter agents with blacklisted tokens', async () => {
      // Arrange
      const tokenAddress = 'BlacklistedToken12345678901234567890123';
      const signal = createMockSignal({ tokenAddress });
      // Override default mock to only return 2 agents for this test
      mockRedisAgentService.getActiveAgentIds.mockResolvedValueOnce(['agent-1', 'agent-2']);
      
      const config1 = createMockConfig({
        signals: {
          minScore: 1,
          allowedSignalTypes: [],
          tokenFilterMode: 'blacklist',
          tokenList: [tokenAddress], // Blacklisted
        },
      });
      const config2 = createMockConfig({
        signals: {
          minScore: 1,
          allowedSignalTypes: [],
          tokenFilterMode: 'none', // No filter
          tokenList: [],
        },
      });
      
      mockRedisConfigService.getAgentConfig
        .mockResolvedValueOnce(config1) // agent-1: blacklisted
        .mockResolvedValueOnce(config2); // agent-2: eligible
      
      // Act
      const result = await agentEligibilityService.getEligibleAgents(signal, null);
      
      // Assert
      expect(result).toHaveLength(1);
      expect(result).toContain('agent-2');
      expect(result).not.toContain('agent-1');
    });

    it('should filter agents when whitelist is enabled and token not in whitelist', async () => {
      // Arrange
      const tokenAddress = 'Token12345678901234567890123456789012';
      const signal = createMockSignal({ tokenAddress });
      // Override default mock to only return 2 agents for this test
      mockRedisAgentService.getActiveAgentIds.mockResolvedValueOnce(['agent-1', 'agent-2']);
      
      const config1 = createMockConfig({
        signals: {
          minScore: 1,
          allowedSignalTypes: [],
          tokenFilterMode: 'whitelist',
          tokenList: ['OtherToken1234567890123456789012345'], // Token not in whitelist
        },
      });
      const config2 = createMockConfig({
        signals: {
          minScore: 1,
          allowedSignalTypes: [],
          tokenFilterMode: 'whitelist',
          tokenList: [tokenAddress], // Token in whitelist
        },
      });
      
      mockRedisConfigService.getAgentConfig
        .mockResolvedValueOnce(config1) // agent-1: not in whitelist
        .mockResolvedValueOnce(config2); // agent-2: in whitelist
      
      // Act
      const result = await agentEligibilityService.getEligibleAgents(signal, null);
      
      // Assert
      expect(result).toHaveLength(1);
      expect(result).toContain('agent-2');
      expect(result).not.toContain('agent-1');
    });

    it('should allow all agents when token filter mode is none', async () => {
      // Arrange
      const signal = createMockSignal({ signalStrength: 5 });
      const config = createMockConfig({
        signals: {
          minScore: 1,
          allowedSignalTypes: [],
          tokenFilterMode: 'none',
          tokenList: [],
        },
      });
      
      mockRedisConfigService.getAgentConfig.mockResolvedValue(config);
      
      // Act
      const result = await agentEligibilityService.getEligibleAgents(signal, null);
      
      // Assert
      expect(result).toHaveLength(3);
    });

    it('should return empty array when no active agents', async () => {
      // Arrange
      const signal = createMockSignal();
      mockRedisAgentService.getActiveAgentIds.mockResolvedValue([]);
      
      // Act
      const result = await agentEligibilityService.getEligibleAgents(signal, null);
      
      // Assert
      expect(result).toHaveLength(0);
    });

    it('should filter agents with no config found', async () => {
      // Arrange
      const signal = createMockSignal();
      
      mockRedisConfigService.getAgentConfig
        .mockResolvedValueOnce(null) // agent-1: no config
        .mockResolvedValueOnce(createMockConfig()) // agent-2: has config
        .mockResolvedValueOnce(null); // agent-3: no config
      
      // Act
      const result = await agentEligibilityService.getEligibleAgents(signal, null);
      
      // Assert
      expect(result).toHaveLength(1);
      expect(result).toContain('agent-2');
    });

    it('should accept any signal type (BUY, SELL, Hypersurge, etc.)', async () => {
      // Arrange
      const signalTypes = ['BUY', 'SELL', 'Hypersurge', 'Pump', 'Dump'];
      const config = createMockConfig();
      
      mockRedisConfigService.getAgentConfig.mockResolvedValue(config);
      
      // Act & Assert
      for (const signalType of signalTypes) {
        const signal = createMockSignal({ signalType: signalType as any });
        const result = await agentEligibilityService.getEligibleAgents(signal, null);
        expect(result.length).toBeGreaterThan(0);
      }
    });

    it('should handle multiple filter criteria together', async () => {
      // Arrange
      const tokenAddress = 'Token12345678901234567890123456789012';
      const signal = createMockSignal({ tokenAddress, signalStrength: 3 });
      const fourAgentIds = ['agent-1', 'agent-2', 'agent-3', 'agent-4'];
      mockRedisAgentService.getActiveAgentIds.mockResolvedValueOnce(fourAgentIds);
      mockPrisma.agent.findMany.mockResolvedValueOnce(fourAgentIds.map((id) => ({ id })));
      
      const config1 = createMockConfig({
        signals: {
          minScore: 5, // Too high
          allowedSignalTypes: [],
          tokenFilterMode: 'none',
          tokenList: [],
        },
      });
      
      const config2 = createMockConfig({
        signals: {
          minScore: 1, // OK
          allowedSignalTypes: [],
          tokenFilterMode: 'blacklist',
          tokenList: [tokenAddress], // Blacklisted
        },
      });
      
      const config3 = createMockConfig({
        signals: {
          minScore: 1, // OK
          allowedSignalTypes: [],
          tokenFilterMode: 'whitelist',
          tokenList: ['OtherToken1234567890123456789012345'], // Not in whitelist
        },
      });
      
      const config4 = createMockConfig({
        signals: {
          minScore: 1, // OK
          allowedSignalTypes: [],
          tokenFilterMode: 'whitelist',
          tokenList: [tokenAddress], // In whitelist
        },
      });
      
      mockRedisConfigService.getAgentConfig
        .mockResolvedValueOnce(config1) // agent-1: signal strength too low
        .mockResolvedValueOnce(config2) // agent-2: token blacklisted
        .mockResolvedValueOnce(config3) // agent-3: not in whitelist
        .mockResolvedValueOnce(config4); // agent-4: eligible
      
      // Act
      const result = await agentEligibilityService.getEligibleAgents(signal, null);
      
      // Assert
      expect(result).toHaveLength(1);
      expect(result).toContain('agent-4');
    });

    it('should filter agents by signal type when allowedSignalTypes is configured', async () => {
      // Arrange
      const signal = createMockSignal({ signalType: 'Hypersurge', signalStrength: 5 });
      // Override default mock to only return 3 agents for this test
      mockRedisAgentService.getActiveAgentIds.mockResolvedValueOnce(['agent-1', 'agent-2', 'agent-3']);
      
      const config1 = createMockConfig({
        signals: {
          minScore: 1,
          allowedSignalTypes: ['buy', 'sell'], // Hypersurge not allowed
          tokenFilterMode: 'none',
          tokenList: [],
        },
      });
      const config2 = createMockConfig({
        signals: {
          minScore: 1,
          allowedSignalTypes: ['Hypersurge', 'Pump'], // Hypersurge allowed
          tokenFilterMode: 'none',
          tokenList: [],
        },
      });
      const config3 = createMockConfig({
        signals: {
          minScore: 1,
          allowedSignalTypes: [], // Empty = accept all
          tokenFilterMode: 'none',
          tokenList: [],
        },
      });
      
      mockRedisConfigService.getAgentConfig
        .mockResolvedValueOnce(config1) // agent-1: signal type not allowed
        .mockResolvedValueOnce(config2) // agent-2: signal type allowed
        .mockResolvedValueOnce(config3); // agent-3: accepts all signal types
      
      // Act
      const result = await agentEligibilityService.getEligibleAgents(signal, null);
      
      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContain('agent-2');
      expect(result).toContain('agent-3');
      expect(result).not.toContain('agent-1');
    });

    describe('token metrics (Jupiter) pre-check', () => {
      const tokenMetrics = {
        mcap: 1_000_000,
        liquidity: 500_000,
        holderCount: 1000,
      };

      it('should allow agent when token metrics are within bounds', async () => {
        const signal = createMockSignal();
        mockRedisAgentService.getActiveAgentIds.mockResolvedValueOnce(['agent-1']);
        const config = createMockConfig({
          signals: {
            minScore: 1,
            allowedSignalTypes: [],
            tokenFilterMode: 'none',
            tokenList: [],
            marketCapMin: 500_000,
            marketCapMax: 2_000_000,
            liquidityMin: 100_000,
            holderCountMin: 500,
          },
        });
        mockRedisConfigService.getAgentConfig.mockResolvedValue(config);

        const result = await agentEligibilityService.getEligibleAgents(signal, tokenMetrics);

        expect(result).toHaveLength(1);
        expect(result).toContain('agent-1');
      });

      it('should filter agent when token metrics are null and agent has bounds set', async () => {
        const signal = createMockSignal();
        mockRedisAgentService.getActiveAgentIds.mockResolvedValueOnce(['agent-1']);
        const config = createMockConfig({
          signals: {
            minScore: 1,
            allowedSignalTypes: [],
            tokenFilterMode: 'none',
            tokenList: [],
            marketCapMin: 100_000,
          },
        });
        mockRedisConfigService.getAgentConfig.mockResolvedValue(config);

        const result = await agentEligibilityService.getEligibleAgents(signal, null);

        expect(result).toHaveLength(0);
      });

      it('should filter agent when mcap below min', async () => {
        const signal = createMockSignal();
        mockRedisAgentService.getActiveAgentIds.mockResolvedValueOnce(['agent-1']);
        const config = createMockConfig({
          signals: {
            minScore: 1,
            allowedSignalTypes: [],
            tokenFilterMode: 'none',
            tokenList: [],
            marketCapMin: 5_000_000,
          },
        });
        mockRedisConfigService.getAgentConfig.mockResolvedValue(config);

        const result = await agentEligibilityService.getEligibleAgents(signal, tokenMetrics);

        expect(result).toHaveLength(0);
      });

      it('should not apply token metrics check when agent has no bounds set', async () => {
        const signal = createMockSignal();
        mockRedisAgentService.getActiveAgentIds.mockResolvedValueOnce(['agent-1']);
        const config = createMockConfig({
          signals: {
            minScore: 1,
            allowedSignalTypes: [],
            tokenFilterMode: 'none',
            tokenList: [],
            // no marketCapMin/Max etc.
          },
        });
        mockRedisConfigService.getAgentConfig.mockResolvedValue(config);

        const result = await agentEligibilityService.getEligibleAgents(signal, null);

        expect(result).toHaveLength(1);
      });
    });
  });
});
