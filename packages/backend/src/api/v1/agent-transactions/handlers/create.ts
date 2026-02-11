/**
 * Create agent transaction endpoint
 * 
 * POST /api/agent-transactions
 * 
 * Creates a new agent transaction.
 * Requires authentication. Users can only create transactions for their own agents.
 */

import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { CreateAgentTransactionRequest, AgentTransactionResponse, TransactionType } from '../types.js';
import { TransactionType as PrismaTransactionType } from '@prisma/client';
import { getDefaultWalletForAgent, validateWalletBelongsToAgent } from '../../wallets/helpers.js';
import { balanceService, BalanceError } from '@/domain/balances/balance-service.js';
import { redisBalanceService } from '@/infrastructure/cache/redis-balance-service.js';
import { SOL_MINT_ADDRESS } from '@/infrastructure/external/jupiter/index.js';

/**
 * Create a new agent transaction
 * 
 * Body: { agentId, transactionType, transactionValueUsd, transactionTime, ... }
 * Returns: { id, agentId, transactionType, transactionValueUsd, ... }
 */
export async function createAgentTransaction(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const {
      agentId,
      walletAddress,
      transactionType,
      transactionValueUsd,
      transactionTime,
      destinationAddress,
      signalId,
      fees,
      routes,
      inputMint,
      inputSymbol,
      inputAmount,
      inputPrice,
      outputMint,
      outputSymbol,
      outputAmount,
      outputPrice,
      slippage,
      priceImpact,
      isDca,
    }: CreateAgentTransactionRequest = req.body;

    // Validate required fields
    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({
        error: 'Agent ID is required',
      });
    }

    // Verify agent belongs to the authenticated user
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { userId: true },
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
      });
    }

    if (agent.userId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden: You can only create transactions for your own agents',
      });
    }

    // Determine walletAddress - use provided one or get default based on agent's trading mode
    let finalWalletAddress: string | null = walletAddress || null;
    if (!finalWalletAddress) {
      finalWalletAddress = await getDefaultWalletForAgent(agentId);
    } else {
      // Validate that the provided walletAddress belongs to the agent
      const isValid = await validateWalletBelongsToAgent(finalWalletAddress, agentId);
      if (!isValid) {
        return res.status(400).json({
          error: 'Wallet does not belong to the specified agent',
        });
      }
    }

    // Wallet is required for balance updates
    if (!finalWalletAddress) {
      return res.status(400).json({
        error: 'No wallet found for agent. Please create a wallet first.',
      });
    }

    // Validate transaction type
    if (!transactionType || !Object.values(PrismaTransactionType).includes(transactionType as PrismaTransactionType)) {
      return res.status(400).json({
        error: 'Valid transaction type is required (DEPOSIT, SWAP, BURN)',
      });
    }

    // Validate transaction value
    if (transactionValueUsd === undefined || transactionValueUsd === null) {
      return res.status(400).json({
        error: 'Transaction value USD is required',
      });
    }

    const transactionValueDecimal = new Decimal(transactionValueUsd.toString());
    if (transactionValueDecimal.lt(0)) {
      return res.status(400).json({
        error: 'Transaction value USD must be non-negative',
      });
    }

    // Validate transaction time
    if (!transactionTime) {
      return res.status(400).json({
        error: 'Transaction time is required',
      });
    }

    const transactionTimeDate = new Date(transactionTime);
    if (isNaN(transactionTimeDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid transaction time format (use ISO date string)',
      });
    }

    // Validate signal ID if provided
    let parsedSignalId: number | null = null;
    if (signalId !== undefined && signalId !== null) {
      parsedSignalId = typeof signalId === 'string' ? parseInt(signalId, 10) : signalId;
      if (typeof parsedSignalId !== 'number' || isNaN(parsedSignalId)) {
        return res.status(400).json({
          error: 'Signal ID must be a valid integer',
        });
      }

      // Verify signal exists
      const signal = await prisma.tradingSignal.findUnique({
        where: { id: parsedSignalId },
      });

      if (!signal) {
        return res.status(404).json({
          error: 'Trading signal not found',
        });
      }
    }

    // Validate destination address if provided
    if (destinationAddress !== undefined && destinationAddress !== null) {
      if (typeof destinationAddress !== 'string' || destinationAddress.length > 255) {
        return res.status(400).json({
          error: 'Destination address must be a string with max 255 characters',
        });
      }
    }

    // Validate decimal fields
    const feesDecimal = fees !== undefined && fees !== null ? new Decimal(fees.toString()) : null;
    const inputAmountDecimal = inputAmount !== undefined && inputAmount !== null ? new Decimal(inputAmount.toString()) : null;
    const inputPriceDecimal = inputPrice !== undefined && inputPrice !== null ? new Decimal(inputPrice.toString()) : null;
    const outputAmountDecimal = outputAmount !== undefined && outputAmount !== null ? new Decimal(outputAmount.toString()) : null;
    const outputPriceDecimal = outputPrice !== undefined && outputPrice !== null ? new Decimal(outputPrice.toString()) : null;
    const slippageDecimal = slippage !== undefined && slippage !== null ? new Decimal(slippage.toString()) : null;
    const priceImpactDecimal = priceImpact !== undefined && priceImpact !== null ? new Decimal(priceImpact.toString()) : null;

    // Validate string fields
    if (inputMint !== undefined && inputMint !== null && (typeof inputMint !== 'string' || inputMint.length > 255)) {
      return res.status(400).json({
        error: 'Input mint must be a string with max 255 characters',
      });
    }

    if (inputSymbol !== undefined && inputSymbol !== null && (typeof inputSymbol !== 'string' || inputSymbol.length > 20)) {
      return res.status(400).json({
        error: 'Input symbol must be a string with max 20 characters',
      });
    }

    if (outputMint !== undefined && outputMint !== null && (typeof outputMint !== 'string' || outputMint.length > 255)) {
      return res.status(400).json({
        error: 'Output mint must be a string with max 255 characters',
      });
    }

    if (outputSymbol !== undefined && outputSymbol !== null && (typeof outputSymbol !== 'string' || outputSymbol.length > 20)) {
      return res.status(400).json({
        error: 'Output symbol must be a string with max 20 characters',
      });
    }

    // Create transaction and update balances atomically
    const transaction = await prisma.$transaction(async (tx) => {
      // Update balances first (will validate and lock rows)
      try {
        await balanceService.updateBalancesFromTransaction(
          finalWalletAddress!,
          agentId,
          transactionType,
          inputMint?.trim() || null,
          inputSymbol?.trim() || null,
          inputAmountDecimal,
          outputMint?.trim() || null,
          outputSymbol?.trim() || null,
          outputAmountDecimal,
          tx
        );
      } catch (error) {
        // Handle balance errors with specific error messages
        if (error instanceof BalanceError) {
          const errorResponse: Record<string, unknown> = {
            error: error.message,
          };

          if (error.currentBalance !== undefined) {
            errorResponse.currentBalance = error.currentBalance;
          }
          if (error.requiredAmount !== undefined) {
            errorResponse.requiredAmount = error.requiredAmount;
          }
          if (error.tokenAddress) {
            errorResponse.tokenAddress = error.tokenAddress;
          }
          if (error.tokenSymbol) {
            errorResponse.tokenSymbol = error.tokenSymbol;
          }

          // Return error response (will be caught and sent)
          throw {
            statusCode: 400,
            response: errorResponse,
          };
        }

        // Handle validation errors from balance service
        if (error instanceof Error) {
          // Check for common validation errors
          if (
            error.message.includes('Input amount must be positive') ||
            error.message.includes('Input token') ||
            error.message.includes('Output token') ||
            error.message.includes('Output amount must be positive')
          ) {
            throw {
              statusCode: 400,
              response: {
                error: error.message,
              },
            };
          }
        }

        // Re-throw other errors
        throw error;
      }

      // Create transaction record (Prisma create uses relations: agent, wallet, signal)
      const createData: Prisma.AgentTransactionCreateInput = {
        agent: { connect: { id: agentId } },
        ...(finalWalletAddress ? { wallet: { connect: { walletAddress: finalWalletAddress } } } : {}),
        transactionType,
        transactionValueUsd: transactionValueDecimal,
        transactionTime: transactionTimeDate,
        destinationAddress: destinationAddress?.trim() || null,
        fees: feesDecimal,
        routes: routes || null,
        inputMint: inputMint?.trim() || null,
        inputSymbol: inputSymbol?.trim() || null,
        inputAmount: inputAmountDecimal,
        inputPrice: inputPriceDecimal,
        outputMint: outputMint?.trim() || null,
        outputSymbol: outputSymbol?.trim() || null,
        outputAmount: outputAmountDecimal,
        outputPrice: outputPriceDecimal,
        slippage: slippageDecimal,
        priceImpact: priceImpactDecimal,
        isDca: isDca ?? false,
        ...(parsedSignalId !== null ? { signal: { connect: { id: parsedSignalId } } } : {}),
      };

      return await tx.agentTransaction.create({
        data: createData,
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
      });
    });

    // After transaction commits: Update Redis cache for balances
    // Fetch updated balances from DB (they were updated within the transaction)
    const tokensToUpdate = new Set<string>();
    
    // Determine which tokens were affected
    if (inputMint?.trim()) {
      tokensToUpdate.add(inputMint.trim());
    }
    if (outputMint?.trim()) {
      tokensToUpdate.add(outputMint.trim());
    }
    
    // For deposits without explicit inputMint, assume SOL
    if (!inputMint && (transactionType === PrismaTransactionType.DEPOSIT)) {
      tokensToUpdate.add(SOL_MINT_ADDRESS);
    }

    // Update Redis cache for affected balances
    for (const tokenAddress of tokensToUpdate) {
      try {
        const balance = await prisma.agentBalance.findUnique({
          where: {
            walletAddress_tokenAddress: {
              walletAddress: finalWalletAddress!,
              tokenAddress,
            },
          },
        });

        if (balance) {
          await redisBalanceService.setBalance({
            id: balance.id,
            agentId: balance.agentId,
            walletAddress: balance.walletAddress,
            tokenAddress: balance.tokenAddress,
            tokenSymbol: balance.tokenSymbol,
            balance: balance.balance,
            lastUpdated: balance.lastUpdated,
          });
        }
      } catch (error) {
        // Log but don't fail - cache update is best-effort
        console.error(`[CreateTransaction] ⚠️  Failed to update cache for balance ${tokenAddress}:`, error);
      }
    }

    const response: AgentTransactionResponse = {
      id: transaction.id,
      agentId: transaction.agentId,
      walletAddress: transaction.walletAddress,
      transactionType: transaction.transactionType as TransactionType,
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

    res.status(201).json(response);
  } catch (error: unknown) {
    // Handle balance errors with specific status codes
    if (error && typeof error === 'object' && 'statusCode' in error && 'response' in error) {
      const err = error as { statusCode: number; response: Record<string, unknown> };
      return res.status(err.statusCode).json(err.response);
    }

    console.error('Create agent transaction error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

