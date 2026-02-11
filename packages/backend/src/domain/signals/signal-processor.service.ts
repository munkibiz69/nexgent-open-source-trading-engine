/**
 * Signal Processor Service
 * 
 * Orchestrates the processing of trading signals.
 * Listens for new signals and triggers execution for eligible agents.
 */

import { signalEventEmitter } from './signal-events.js';
import { agentEligibilityService } from './agent-eligibility.service.js';
import { signalExecutionService } from './execution-tracker.service.js';
import { tradingExecutor, TradingExecutorError } from '../trading/trading-executor.service.js';
import { fetchTokenMetrics } from '@/infrastructure/external/jupiter/index.js';
import type { TradingSignal } from '@prisma/client';
import { signalProcessingLatency, signalProcessingCount, errorCount } from '@/infrastructure/metrics/metrics.js';
import logger from '@/infrastructure/logging/logger.js';

export class SignalProcessor {
  private static instance: SignalProcessor;
  private isProcessing: boolean = false;

  private constructor() {
    this.setupEventListeners();
  }

  public static getInstance(): SignalProcessor {
    if (!SignalProcessor.instance) {
      SignalProcessor.instance = new SignalProcessor();
    }
    return SignalProcessor.instance;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    signalEventEmitter.on('signal_created', async (event) => {
      await this.processSignal(event.signal);
    });
    logger.info('Signal Processor listening for signal_created events');
  }

  /**
   * Process a trading signal
   */
  public async processSignal(signal: TradingSignal): Promise<void> {
    const startTime = Date.now();
    const signalLogger = logger.child({ signalId: signal.id, tokenAddress: signal.tokenAddress });
    
    signalLogger.info('Processing signal');

    try {
      // 1. Fetch token metrics once per signal (one Jupiter API call; reused for all agents)
      const tokenMetrics = await fetchTokenMetrics(signal.tokenAddress);

      // 2. Get eligible agents (pass token metrics for token-metrics pre-check)
      const eligibleAgentIds = await agentEligibilityService.getEligibleAgents(signal, tokenMetrics);
      signalLogger.info({ eligibleAgentCount: eligibleAgentIds.length }, 'Found eligible agents');

      if (eligibleAgentIds.length === 0) {
        const duration = Date.now() - startTime;
        const durationSeconds = duration / 1000;
        signalProcessingLatency.observe({ status: 'skipped' }, durationSeconds);
        signalProcessingCount.inc({ status: 'skipped' });
        return;
      }

      // 3. Execute for each agent
      // We execute in parallel for maximum speed
      await Promise.all(eligibleAgentIds.map(async (agentId) => {
        await this.executeForAgent(agentId, signal);
      }));

      // Record success metrics
      const duration = Date.now() - startTime;
      const durationSeconds = duration / 1000;
      signalProcessingLatency.observe({ status: 'success' }, durationSeconds);
      signalProcessingCount.inc({ status: 'success' });
      
      signalLogger.info({ duration, eligibleAgentCount: eligibleAgentIds.length }, 'Signal processing completed');

    } catch (error) {
      const duration = Date.now() - startTime;
      const durationSeconds = duration / 1000;
      
      // Record failure metrics
      signalProcessingLatency.observe({ status: 'failed' }, durationSeconds);
      signalProcessingCount.inc({ status: 'failed' });
      errorCount.inc({ type: 'signals', code: 'PROCESSING_FAILED' });
      
      signalLogger.error({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration,
      }, 'Error processing signal');
    }
  }

  /**
   * Execute signal for a specific agent
   */
  private async executeForAgent(agentId: string, signal: TradingSignal): Promise<void> {
    // 1. Create execution record (deduplication)
    const executionId = await signalExecutionService.createPendingExecution(signal.id, agentId);
    
    if (!executionId) {
      // Already processing or processed
      return;
    }

    try {
      // 2. Execute trade
      // Note: walletAddress is optional, executor will pick default for agent
      const result = await tradingExecutor.executePurchase({
        agentId,
        tokenAddress: signal.tokenAddress,
        tokenSymbol: signal.symbol || undefined,
        signalId: signal.id,
        // Position size is calculated by executor based on agent config
      });

      // 3. Update execution status (Success)
      await signalExecutionService.updateExecutionSuccess(executionId, result.transactionId);
      
      logger.info({
        signalId: signal.id,
        agentId,
        executionId,
        transactionId: result.transactionId,
        positionId: result.positionId,
      }, 'Executed trade for agent on signal');

    } catch (error) {
      // 4. Update execution status (Failure)
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = error instanceof TradingExecutorError ? error.code : 'EXECUTION_FAILED';
      
      // Downgrade insufficient balance errors to warnings (expected business logic)
      const isInsufficientBalance = errorCode === 'INSUFFICIENT_BALANCE' || 
                                    errorMessage.includes('Insufficient SOL balance') ||
                                    errorMessage.includes('Insufficient balance');
      
      if (isInsufficientBalance) {
        logger.warn({
          signalId: signal.id,
          agentId,
          executionId,
          error: errorMessage,
          code: errorCode,
        }, 'Trade skipped: insufficient balance');
      } else {
        logger.error({
          signalId: signal.id,
          agentId,
          executionId,
          error: errorMessage,
          code: errorCode,
        }, 'Failed to execute trade for agent');
      }
      
      errorCount.inc({ type: 'signals', code: errorCode });
      
      // Check if it was a "soft" failure (e.g. insufficient balance) or hard error
      // We record it as FAILED regardless, but error message helps
      await signalExecutionService.updateExecutionFailure(executionId, error as Error);
    }
  }
}

// Export singleton instance
export const signalProcessor = SignalProcessor.getInstance();

