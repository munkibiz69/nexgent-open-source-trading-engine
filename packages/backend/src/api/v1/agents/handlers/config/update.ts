/**
 * Update agent trading configuration endpoint
 * 
 * PUT /api/agents/:id/config
 * PATCH /api/agents/:id/config
 * 
 * Updates the trading configuration for an agent.
 * Performs deep merge with existing config.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import { configService, ConfigServiceError } from '@/domain/trading/config-service.js';
import { agentService, AgentServiceError } from '@/domain/agents/agent-service.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { UpdateTradingConfigRequest, TradingConfigResponse } from './types.js';
import type { AgentTradingConfig } from '@nexgent/shared';

/**
 * Update trading configuration for an agent
 * 
 * Params: { id: string }
 * Body: { config: Partial<AgentTradingConfig> | null }
 * Returns: { config: AgentTradingConfig }
 */
export async function updateAgentTradingConfig(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;
    const { config: partialConfig }: UpdateTradingConfigRequest = req.body;

    // Validate ID format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: 'Invalid agent ID format',
      });
    }

    // Validate request body
    if (partialConfig === undefined) {
      return res.status(400).json({
        error: 'Config is required in request body',
      });
    }

    // Verify agent exists and belongs to the authenticated user
    const agent = await prisma.agent.findFirst({
      where: {
        id,
        userId: req.user.id, // Ensure user can only update their own agents
      },
      select: {
        id: true,
      },
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
      });
    }

    let finalConfig: AgentTradingConfig | null = null;

    if (partialConfig === null) {
      // Reset to defaults
      finalConfig = null;
    } else {
      // Load existing config (already merged with defaults)
      const existingConfig = await configService.loadAgentConfig(id);
      
      // Deep merge partial config with existing config
      finalConfig = configService.mergeConfigs(existingConfig, partialConfig);

      // Validate the merged config
      const validationResult = configService.validateConfig(finalConfig);
      if (!validationResult.valid) {
        return res.status(400).json({
          error: 'Invalid trading configuration',
          details: validationResult.errors,
        });
      }
    }

    // Update configuration (service handles DB save and cache invalidation)
    const updatedConfig = await agentService.updateAgentConfig(id, finalConfig);

    const response: TradingConfigResponse = {
      config: updatedConfig,
    };

    res.json(response);
  } catch (error) {
    console.error('Update agent trading config error:', error);
    
    // Handle service errors
    if (error instanceof AgentServiceError) {
      if (error.code === 'AGENT_NOT_FOUND') {
        return res.status(404).json({
          error: error.message,
        });
      }
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }
    
    // Handle config service errors
    if (error instanceof ConfigServiceError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
        details: error.details,
      });
    }

    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

