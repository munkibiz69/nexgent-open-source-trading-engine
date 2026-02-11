/**
 * Balance Snapshot Service
 * 
 * Handles capturing and managing balance snapshots for agents.
 * Snapshots are captured hourly and stored for historical charting.
 */

import { Decimal } from '@prisma/client/runtime/library';
import type { IBalanceSnapshotRepository } from './balance-snapshot.repository.js';
import { performanceService } from '../performance/performance.service.js';
import { prisma } from '@/infrastructure/database/client.js';

export interface CaptureSnapshotResult {
  agentId: string;
  success: boolean;
  error?: string;
}

export interface CaptureAllSnapshotsResult {
  success: number;
  failed: number;
  errors: Array<{ agentId: string; error: string }>;
}

export class BalanceSnapshotService {
  constructor(private readonly snapshotRepo: IBalanceSnapshotRepository) {}

  /**
   * Capture a balance snapshot for a single agent and wallet
   * 
   * @param agentId - Agent ID to capture snapshot for
   * @param walletAddress - Wallet address to capture snapshot for
   * @returns Result indicating success or failure
   */
  async captureSnapshot(agentId: string, walletAddress: string): Promise<CaptureSnapshotResult> {
    try {
      // Verify agent and wallet exist
      const wallet = await prisma.agentWallet.findFirst({
        where: { agentId, walletAddress },
      });

      if (!wallet) {
        return {
          agentId,
          success: false,
          error: `Wallet not found: ${walletAddress} for agent ${agentId}`,
        };
      }

      // Get detailed balance breakdown for this wallet
      const balanceBreakdown = await performanceService.getBalanceBreakdown(agentId, walletAddress);

      // Normalize timestamp to hour boundary (e.g., 14:37 → 14:00)
      const now = new Date();
      const normalizedTimestamp = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          now.getUTCHours(),
          0, // minutes = 0
          0, // seconds = 0
          0  // milliseconds = 0
        )
      );
      
      // Store snapshot using upsert for idempotency
      await this.snapshotRepo.upsert(
        agentId,
        walletAddress,
        normalizedTimestamp,
        new Decimal(balanceBreakdown.portfolioBalanceSol),
        new Decimal(balanceBreakdown.solBalance),
        new Decimal(balanceBreakdown.positionsValueSol),
        new Decimal(balanceBreakdown.unrealizedPnLSol),
      );

      return {
        agentId,
        success: true,
      };
    } catch (error) {
      return {
        agentId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Capture snapshots for all agents and their wallets
   * 
   * @returns Summary of results
   */
  async captureSnapshotsForAllAgents(): Promise<CaptureAllSnapshotsResult> {
    const agents = await prisma.agent.findMany({
      include: {
        wallets: {
          select: { walletAddress: true },
        },
      },
    });

    const results: CaptureAllSnapshotsResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // Process agents and their wallets
    for (const agent of agents) {
      for (const wallet of agent.wallets) {
        const result = await this.captureSnapshot(agent.id, wallet.walletAddress);
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push({
            agentId: result.agentId,
            error: result.error || 'Unknown error',
          });
        }
      }
    }

    return results;
  }
}
