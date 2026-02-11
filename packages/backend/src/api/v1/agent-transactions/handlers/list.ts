/**
 * List agent transactions endpoint
 * 
 * GET /api/agent-transactions
 * 
 * Returns agent transactions with optional filtering.
 * Requires authentication. Users can only access transactions for their own agents.
 */

import { Response } from 'express';
import { Prisma, TransactionType as PrismaTransactionType } from '@prisma/client';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { AgentTransactionResponse, ListAgentTransactionsQuery } from '../types.js';

/**
 * Get agent transactions with optional filters
 * 
 * Query params:
 * - agentId: Required - Filter by agent ID
 * - transactionType: Filter by transaction type
 * - startTime: Filter by start time (ISO string)
 * - endTime: Filter by end time (ISO string)
 * - signalId: Filter by signal ID
 * - isDca: Filter by DCA flag ("true" or "false")
 * - limit: Maximum number of results (default: 100)
 * - offset: Number of results to skip (default: 0)
 * 
 * Returns: Array of transaction objects
 */
export async function listAgentTransactions(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const query = req.query as unknown as ListAgentTransactionsQuery;

    // Validate required agentId
    if (!query.agentId) {
      return res.status(400).json({
        error: 'Agent ID is required',
      });
    }

    // Verify agent belongs to the authenticated user
    const agent = await prisma.agent.findUnique({
      where: { id: query.agentId },
      select: { userId: true },
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
      });
    }

    if (agent.userId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden: You can only access transactions for your own agents',
      });
    }

    // Build where clause
    const where: Prisma.AgentTransactionWhereInput = {
      agentId: query.agentId,
    };

    // Filter by walletAddress if provided
    if (query.walletAddress) {
      where.walletAddress = query.walletAddress;
    }

    if (query.transactionType) {
      if (!Object.values(PrismaTransactionType).includes(query.transactionType as PrismaTransactionType)) {
        return res.status(400).json({
          error: 'Invalid transaction type',
        });
      }
      where.transactionType = query.transactionType;
    }

    if (query.startTime || query.endTime) {
      where.transactionTime = {};
      if (query.startTime) {
        const startDate = new Date(query.startTime);
        if (isNaN(startDate.getTime())) {
          return res.status(400).json({
            error: 'Invalid start time format (use ISO date string)',
          });
        }
        where.transactionTime.gte = startDate;
      }
      if (query.endTime) {
        const endDate = new Date(query.endTime);
        if (isNaN(endDate.getTime())) {
          return res.status(400).json({
            error: 'Invalid end time format (use ISO date string)',
          });
        }
        where.transactionTime.lte = endDate;
      }
    }

    if (query.signalId) {
      const parsedSignalId = parseInt(query.signalId, 10);
      if (isNaN(parsedSignalId)) {
        return res.status(400).json({
          error: 'Signal ID must be a valid integer',
        });
      }
      where.signalId = parsedSignalId;
    }

    if (query.isDca !== undefined) {
      where.isDca = query.isDca === 'true';
    }

    if (query.isTakeProfit !== undefined) {
      where.isTakeProfit = query.isTakeProfit === 'true';
    }

    // Parse pagination
    const limit = query.limit ? Math.min(parseInt(query.limit, 10), 1000) : 100;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    // Validate pagination
    if (isNaN(limit) || limit < 1) {
      return res.status(400).json({
        error: 'Limit must be a positive number',
      });
    }

    if (isNaN(offset) || offset < 0) {
      return res.status(400).json({
        error: 'Offset must be a non-negative number',
      });
    }

    // Get transactions
    const transactions = await prisma.agentTransaction.findMany({
      where,
      select: {
        id: true,
        agentId: true,
        walletAddress: true,
        transactionType: true,
        transactionValueUsd: true,
        transactionTime: true,
        destinationAddress: true,
        signalId: true,
        fees: true,
        routes: true,
        swapPayload: true,
        inputMint: true,
        inputSymbol: true,
        inputAmount: true,
        inputPrice: true,
        outputMint: true,
        outputSymbol: true,
        outputAmount: true,
        outputPrice: true,
        slippage: true,
        priceImpact: true,
        isDca: true,
        isTakeProfit: true,
        transactionHash: true,
        protocolFeeSol: true,
        networkFeeSol: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        transactionTime: 'desc', // Most recent first
      },
      take: limit,
      skip: offset,
    });

    const response: AgentTransactionResponse[] = transactions.map((transaction) => ({
      id: transaction.id,
      agentId: transaction.agentId,
      walletAddress: transaction.walletAddress,
      transactionType: transaction.transactionType,
      transactionValueUsd: transaction.transactionValueUsd.toString(),
      transactionTime: transaction.transactionTime,
      destinationAddress: transaction.destinationAddress,
      signalId: transaction.signalId,
      fees: transaction.fees?.toString() || null,
      routes: transaction.routes,
      inputMint: transaction.inputMint,
      inputSymbol: transaction.inputSymbol,
      inputAmount: transaction.inputAmount?.toString() || null,
      inputPrice: transaction.inputPrice?.toString() || null,
      outputMint: transaction.outputMint,
      outputSymbol: transaction.outputSymbol,
      outputAmount: transaction.outputAmount?.toString() || null,
      outputPrice: transaction.outputPrice?.toString() || null,
      slippage: transaction.slippage?.toString() || null,
      priceImpact: transaction.priceImpact?.toString() || null,
      isDca: transaction.isDca,
      isTakeProfit: transaction.isTakeProfit,
      transactionHash: transaction.transactionHash,
      protocolFeeSol: transaction.protocolFeeSol?.toString() || null,
      networkFeeSol: transaction.networkFeeSol?.toString() || null,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    }));

    res.json(response);
  } catch (error) {
    console.error('List agent transactions error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

