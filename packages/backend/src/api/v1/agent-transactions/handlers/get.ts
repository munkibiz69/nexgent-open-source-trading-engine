/**
 * Get agent transaction endpoint
 * 
 * GET /api/agent-transactions/:id
 * 
 * Returns a single agent transaction by ID.
 * Requires authentication. Users can only access transactions for their own agents.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { AgentTransactionResponse } from '../types.js';

/**
 * Get an agent transaction by ID
 * 
 * Params: { id: string }
 * Returns: Transaction object
 */
export async function getAgentTransaction(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Transaction ID is required',
      });
    }

    // Get transaction with agent relationship
    const transaction = await prisma.agentTransaction.findUnique({
      where: { id },
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
        agent: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found',
      });
    }

    // Verify transaction belongs to the authenticated user's agent
    if (transaction.agent.userId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden: You can only access transactions for your own agents',
      });
    }

    const response: AgentTransactionResponse = {
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
    };

    res.json(response);
  } catch (error) {
    console.error('Get agent transaction error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

