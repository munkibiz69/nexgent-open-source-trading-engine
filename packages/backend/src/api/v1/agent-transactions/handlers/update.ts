/**
 * Update agent transaction endpoint
 * 
 * PUT /api/agent-transactions/:id
 * 
 * Updates an existing agent transaction.
 * Requires authentication. Users can only update transactions for their own agents.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { UpdateAgentTransactionRequest, AgentTransactionResponse, TransactionType } from '../types.js';
import { Prisma, TransactionType as PrismaTransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { balanceService, BalanceError } from '@/domain/balances/balance-service.js';

/**
 * Update an agent transaction
 * 
 * Params: { id: string }
 * Body: Partial transaction fields
 * Returns: Updated transaction object
 */
export async function updateAgentTransaction(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;
    const updateData: UpdateAgentTransactionRequest = req.body;

    if (!id) {
      return res.status(400).json({
        error: 'Transaction ID is required',
      });
    }

    // Check if transaction exists and belongs to user's agent
    // Fetch full transaction data for balance recalculation
    const existingTransaction = await prisma.agentTransaction.findUnique({
      where: { id },
      select: {
        agentId: true,
        walletAddress: true,
        transactionType: true,
        inputMint: true,
        inputSymbol: true,
        inputAmount: true,
        outputMint: true,
        outputSymbol: true,
        outputAmount: true,
        agent: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existingTransaction) {
      return res.status(404).json({
        error: 'Transaction not found',
      });
    }

    if (existingTransaction.agent.userId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden: You can only update transactions for your own agents',
      });
    }

    // Wallet is required for balance updates
    if (!existingTransaction.walletAddress) {
      return res.status(400).json({
        error: 'Transaction does not have a wallet associated. Cannot update balances.',
      });
    }

    // Build update data
    const data: Prisma.AgentTransactionUpdateInput = {};

    if (updateData.transactionType !== undefined) {
      if (!Object.values(PrismaTransactionType).includes(updateData.transactionType as PrismaTransactionType)) {
        return res.status(400).json({
          error: 'Invalid transaction type',
        });
      }
      data.transactionType = updateData.transactionType;
    }

    if (updateData.transactionValueUsd !== undefined) {
      const value = new Decimal(updateData.transactionValueUsd.toString());
      if (value.lt(0)) {
        return res.status(400).json({
          error: 'Transaction value USD must be non-negative',
        });
      }
      data.transactionValueUsd = value;
    }

    if (updateData.transactionTime !== undefined) {
      const time = new Date(updateData.transactionTime);
      if (isNaN(time.getTime())) {
        return res.status(400).json({
          error: 'Invalid transaction time format (use ISO date string)',
        });
      }
      data.transactionTime = time;
    }

    if (updateData.destinationAddress !== undefined) {
      if (updateData.destinationAddress !== null && (typeof updateData.destinationAddress !== 'string' || updateData.destinationAddress.length > 255)) {
        return res.status(400).json({
          error: 'Destination address must be a string with max 255 characters or null',
        });
      }
      data.destinationAddress = updateData.destinationAddress?.trim() || null;
    }

    if (updateData.signalId !== undefined) {
      if (updateData.signalId !== null) {
        const parsedSignalId =
          typeof updateData.signalId === 'string'
            ? parseInt(updateData.signalId, 10)
            : updateData.signalId;

        if (typeof parsedSignalId !== 'number' || isNaN(parsedSignalId)) {
          return res.status(400).json({
            error: 'Signal ID must be a valid integer or null',
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

        data.signal = { connect: { id: parsedSignalId } };
      } else {
        data.signal = { disconnect: true };
      }
    }

    if (updateData.fees !== undefined) {
      data.fees = updateData.fees !== null ? new Decimal(updateData.fees.toString()) : null;
    }

    if (updateData.routes !== undefined) {
      data.routes = updateData.routes;
    }

    if (updateData.inputMint !== undefined) {
      if (updateData.inputMint !== null && (typeof updateData.inputMint !== 'string' || updateData.inputMint.length > 255)) {
        return res.status(400).json({
          error: 'Input mint must be a string with max 255 characters or null',
        });
      }
      data.inputMint = updateData.inputMint?.trim() || null;
    }

    if (updateData.inputSymbol !== undefined) {
      if (updateData.inputSymbol !== null && (typeof updateData.inputSymbol !== 'string' || updateData.inputSymbol.length > 20)) {
        return res.status(400).json({
          error: 'Input symbol must be a string with max 20 characters or null',
        });
      }
      data.inputSymbol = updateData.inputSymbol?.trim() || null;
    }

    if (updateData.inputPrice !== undefined) {
      data.inputPrice = updateData.inputPrice !== null ? new Decimal(updateData.inputPrice.toString()) : null;
    }

    if (updateData.outputMint !== undefined) {
      if (updateData.outputMint !== null && (typeof updateData.outputMint !== 'string' || updateData.outputMint.length > 255)) {
        return res.status(400).json({
          error: 'Output mint must be a string with max 255 characters or null',
        });
      }
      data.outputMint = updateData.outputMint?.trim() || null;
    }

    if (updateData.outputSymbol !== undefined) {
      if (updateData.outputSymbol !== null && (typeof updateData.outputSymbol !== 'string' || updateData.outputSymbol.length > 20)) {
        return res.status(400).json({
          error: 'Output symbol must be a string with max 20 characters or null',
        });
      }
      data.outputSymbol = updateData.outputSymbol?.trim() || null;
    }

    if (updateData.outputAmount !== undefined) {
      data.outputAmount = updateData.outputAmount !== null ? new Decimal(updateData.outputAmount.toString()) : null;
    }

    if (updateData.outputPrice !== undefined) {
      data.outputPrice = updateData.outputPrice !== null ? new Decimal(updateData.outputPrice.toString()) : null;
    }

    if (updateData.slippage !== undefined) {
      data.slippage = updateData.slippage !== null ? new Decimal(updateData.slippage.toString()) : null;
    }

    if (updateData.priceImpact !== undefined) {
      data.priceImpact = updateData.priceImpact !== null ? new Decimal(updateData.priceImpact.toString()) : null;
    }

    if (updateData.isDca !== undefined) {
      if (typeof updateData.isDca !== 'boolean') {
        return res.status(400).json({
          error: 'isDca must be a boolean',
        });
      }
      data.isDca = updateData.isDca;
    }

    // Check if balance-affecting fields changed
    const balanceAffectingFields = [
      'transactionType',
      'inputMint',
      'inputSymbol',
      'inputAmount',
      'outputMint',
      'outputSymbol',
      'outputAmount',
    ];
    const needsBalanceRecalculation = balanceAffectingFields.some(
      (field) => updateData[field as keyof UpdateAgentTransactionRequest] !== undefined
    );

    // Update transaction and recalculate balances atomically
    const transaction = await prisma.$transaction(async (tx) => {
      // If balance-affecting fields changed, recalculate balances
      if (needsBalanceRecalculation) {
        // Prepare old transaction values
        const oldTransaction = {
          transactionType: existingTransaction.transactionType,
          inputMint: existingTransaction.inputMint,
          inputAmount: existingTransaction.inputAmount
            ? new Decimal(existingTransaction.inputAmount.toString())
            : null,
          outputMint: existingTransaction.outputMint,
          outputAmount: existingTransaction.outputAmount
            ? new Decimal(existingTransaction.outputAmount.toString())
            : null,
        };

        // Prepare new transaction values (merge existing with updates)
        const newTransactionType =
          updateData.transactionType !== undefined
            ? updateData.transactionType
            : existingTransaction.transactionType;
        const newInputMint =
          updateData.inputMint !== undefined
            ? updateData.inputMint
            : existingTransaction.inputMint;
        const newInputSymbol =
          updateData.inputSymbol !== undefined
            ? updateData.inputSymbol
            : existingTransaction.inputSymbol;
        const newInputAmount =
          updateData.inputAmount !== undefined
            ? (updateData.inputAmount !== null
                ? new Decimal(updateData.inputAmount.toString())
                : null)
            : (existingTransaction.inputAmount
                ? new Decimal(existingTransaction.inputAmount.toString())
                : null);
        const newOutputMint =
          updateData.outputMint !== undefined
            ? updateData.outputMint
            : existingTransaction.outputMint;
        const newOutputSymbol =
          updateData.outputSymbol !== undefined
            ? updateData.outputSymbol
            : existingTransaction.outputSymbol;
        const newOutputAmount =
          updateData.outputAmount !== undefined
            ? (updateData.outputAmount !== null
                ? new Decimal(updateData.outputAmount.toString())
                : null)
            : (existingTransaction.outputAmount
                ? new Decimal(existingTransaction.outputAmount.toString())
                : null);

        // Calculate update deltas (reverse old, apply new)
        const updateDeltas = balanceService.calculateUpdateDeltas(
          oldTransaction,
          {
            transactionType: newTransactionType,
            inputMint: newInputMint,
            inputSymbol: newInputSymbol,
            inputAmount: newInputAmount,
            outputMint: newOutputMint,
            outputSymbol: newOutputSymbol,
            outputAmount: newOutputAmount,
          }
        );

        try {
          // Reverse old input balance changes
          if (updateDeltas.oldInputToken) {
            await balanceService.upsertBalance(
              existingTransaction.walletAddress!,
              existingTransaction.agentId,
              updateDeltas.oldInputToken.tokenAddress,
              existingTransaction.inputSymbol || 'UNKNOWN',
              updateDeltas.oldInputToken.delta,
              null,
              tx
            );
          }

          // Reverse old output balance changes (if swap)
          if (updateDeltas.oldOutputToken) {
            await balanceService.upsertBalance(
              existingTransaction.walletAddress!,
              existingTransaction.agentId,
              updateDeltas.oldOutputToken.tokenAddress,
              existingTransaction.outputSymbol || 'UNKNOWN',
              updateDeltas.oldOutputToken.delta,
              null,
              tx
            );
          }

          // Apply new input balance changes
          if (updateDeltas.inputToken) {
            // Lock and validate if needed
            if (updateDeltas.inputToken.requiresValidation || updateDeltas.inputToken.mustExist) {
              await balanceService.lockBalanceRow(
                existingTransaction.walletAddress!,
                updateDeltas.inputToken.tokenAddress,
                tx
              );

              if (updateDeltas.inputToken.requiresValidation) {
                await balanceService.validateSufficientBalance(
                  existingTransaction.walletAddress!,
                  updateDeltas.inputToken.tokenAddress,
                  updateDeltas.inputToken.delta.abs(),
                  tx
                );
              }
            }

            await balanceService.upsertBalance(
              existingTransaction.walletAddress!,
              existingTransaction.agentId,
              updateDeltas.inputToken.tokenAddress,
              updateDeltas.inputToken.tokenSymbol,
              updateDeltas.inputToken.delta,
              updateDeltas.inputToken.delta.gt(0) ? updateDeltas.inputToken.delta : null,
              tx
            );
          }

          // Apply new output balance changes (if swap)
          if (updateDeltas.outputToken) {
            await balanceService.lockBalanceRow(
              existingTransaction.walletAddress!,
              updateDeltas.outputToken.tokenAddress,
              tx
            );

            await balanceService.upsertBalance(
              existingTransaction.walletAddress!,
              existingTransaction.agentId,
              updateDeltas.outputToken.tokenAddress,
              updateDeltas.outputToken.tokenSymbol,
              updateDeltas.outputToken.delta,
              updateDeltas.outputToken.delta, // Initial amount is the delta (positive)
              tx
            );
          }
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
          // Re-throw other errors
          throw error;
        }
      }

      // Update transaction record
      return await tx.agentTransaction.update({
        where: { id },
        data,
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

    res.json(response);
  } catch (error: unknown) {
    // Handle balance errors with specific status codes
    if (error && typeof error === 'object' && 'statusCode' in error && 'response' in error) {
      const err = error as { statusCode: number; response: Record<string, unknown> };
      return res.status(err.statusCode).json(err.response);
    }

    console.error('Update agent transaction error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

