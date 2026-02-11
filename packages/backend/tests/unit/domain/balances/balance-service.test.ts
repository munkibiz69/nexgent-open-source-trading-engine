/**
 * Balance Service Unit Tests
 * 
 * Tests balance delta calculation and validation logic.
 */

// Jest globals are available without import
import { BalanceService, BalanceError } from '@/domain/balances/balance-service.js';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import type { IBalanceRepository } from '@/domain/balances/balance.repository.js';

describe('BalanceService', () => {
  let balanceService: BalanceService;
  let mockRepository: jest.Mocked<IBalanceRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock repository
    mockRepository = {
      findByWalletAddressAndTokenAddress: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      lockRow: jest.fn(),
    } as any;
    
    balanceService = new BalanceService(mockRepository);
  });

  describe('calculateBalanceDelta', () => {
    it('should calculate deposit delta correctly', () => {
      // Arrange
      const inputMint = 'So11111111111111111111111111111111111111112';
      const inputSymbol = 'SOL';
      const inputAmount = new Decimal(10);
      
      // Act
      const result = balanceService.calculateBalanceDelta(
        TransactionType.DEPOSIT,
        inputMint,
        inputSymbol,
        inputAmount
      );
      
      // Assert
      expect(result.inputToken.delta.toNumber()).toBe(10); // Positive (increase)
      expect(result.inputToken.requiresValidation).toBe(false);
      expect(result.inputToken.mustExist).toBe(false);
      expect(result.outputToken).toBeUndefined();
    });

    it('should calculate swap delta correctly', () => {
      // Arrange
      const inputMint = 'So11111111111111111111111111111111111111112';
      const inputSymbol = 'SOL';
      const inputAmount = new Decimal(10);
      const outputMint = 'Token123';
      const outputSymbol = 'TOKEN';
      const outputAmount = new Decimal(1000);
      
      // Act
      const result = balanceService.calculateBalanceDelta(
        TransactionType.SWAP,
        inputMint,
        inputSymbol,
        inputAmount,
        outputMint,
        outputSymbol,
        outputAmount
      );
      
      // Assert
      expect(result.inputToken.delta.toNumber()).toBe(-10); // Negative (decrease)
      expect(result.inputToken.requiresValidation).toBe(true);
      expect(result.inputToken.mustExist).toBe(true);
      
      expect(result.outputToken?.delta.toNumber()).toBe(1000); // Positive (increase)
      expect(result.outputToken?.requiresValidation).toBe(false);
      expect(result.outputToken?.mustExist).toBe(false);
    });

    it('should calculate burn delta correctly', () => {
      // Arrange
      const inputMint = 'Token123';
      const inputSymbol = 'TOKEN';
      const inputAmount = new Decimal(100);
      
      // Act
      const result = balanceService.calculateBalanceDelta(
        TransactionType.BURN,
        inputMint,
        inputSymbol,
        inputAmount
      );
      
      // Assert
      expect(result.inputToken.delta.toNumber()).toBe(-100); // Negative (decrease)
      expect(result.inputToken.requiresValidation).toBe(true);
      expect(result.inputToken.mustExist).toBe(true);
      expect(result.outputToken).toBeUndefined();
    });

    it('should throw error when input token is missing', () => {
      // Act & Assert
      expect(() => {
        balanceService.calculateBalanceDelta(
          TransactionType.DEPOSIT,
          null as any,
          'SOL',
          new Decimal(10)
        );
      }).toThrow('Input token (mint, symbol, amount) is required');
    });

    it('should throw error when input amount is zero or negative', () => {
      // Act & Assert
      expect(() => {
        balanceService.calculateBalanceDelta(
          TransactionType.DEPOSIT,
          'So11111111111111111111111111111111111111112',
          'SOL',
          new Decimal(0)
        );
      }).toThrow('Input amount must be positive');
      
      expect(() => {
        balanceService.calculateBalanceDelta(
          TransactionType.DEPOSIT,
          'So11111111111111111111111111111111111111112',
          'SOL',
          new Decimal(-5)
        );
      }).toThrow('Input amount must be positive');
    });

    it('should throw error when swap output token is missing', () => {
      // Act & Assert
      expect(() => {
        balanceService.calculateBalanceDelta(
          TransactionType.SWAP,
          'So11111111111111111111111111111111111111112',
          'SOL',
          new Decimal(10)
          // Missing output token
        );
      }).toThrow('Output token (mint, symbol, amount) is required for SWAP transactions');
    });

    it('should throw error when swap output amount is zero or negative', () => {
      // Act & Assert
      expect(() => {
        balanceService.calculateBalanceDelta(
          TransactionType.SWAP,
          'So11111111111111111111111111111111111111112',
          'SOL',
          new Decimal(10),
          'Token123',
          'TOKEN',
          new Decimal(0)
        );
      }).toThrow('Output amount must be positive');
    });
  });

  describe('validateSufficientBalance', () => {
    it('should return current balance when balance is sufficient', async () => {
      // Arrange
      const agentId = 'agent-123';
      const walletAddress = 'wallet-123';
      const tokenAddress = 'So11111111111111111111111111111111111111112';
      const requiredAmount = new Decimal(5);
      const currentBalance = new Decimal(10);
      
      mockRepository.findByWalletAddressAndTokenAddress = jest.fn().mockResolvedValue({
        id: 'balance-123',
        agentId,
        walletAddress,
        tokenAddress,
        tokenSymbol: 'SOL',
        balance: currentBalance,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Act
      const result = await balanceService.validateSufficientBalance(
        walletAddress,
        tokenAddress,
        requiredAmount
      );
      
      // Assert
      expect(result.toNumber()).toBe(10);
    });

    it('should throw error when balance is insufficient', async () => {
      // Arrange
      const agentId = 'agent-123';
      const walletAddress = 'wallet-123';
      const tokenAddress = 'So11111111111111111111111111111111111111112';
      const requiredAmount = new Decimal(10);
      
      mockRepository.findByWalletAddressAndTokenAddress = jest.fn().mockResolvedValue({
        id: 'balance-123',
        agentId,
        walletAddress,
        tokenAddress,
        tokenSymbol: 'SOL',
        balance: new Decimal(5),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Act & Assert (single call, two assertions)
      const p = balanceService.validateSufficientBalance(walletAddress, tokenAddress, requiredAmount);
      await expect(p).rejects.toThrow(BalanceError);
      await expect(p).rejects.toThrow('Insufficient balance');
    });

    it('should throw error when balance does not exist', async () => {
      // Arrange
      const walletAddress = 'wallet-123';
      const tokenAddress = 'So11111111111111111111111111111111111111112';
      const requiredAmount = new Decimal(10);
      
      mockRepository.findByWalletAddressAndTokenAddress = jest.fn().mockResolvedValue(null);
      
      // Act & Assert (single call, two assertions)
      const p = balanceService.validateSufficientBalance(walletAddress, tokenAddress, requiredAmount);
      await expect(p).rejects.toThrow(BalanceError);
      await expect(p).rejects.toThrow('Balance not found for token');
    });

    it('should return current balance when balance exactly equals required amount', async () => {
      // Arrange
      const agentId = 'agent-123';
      const walletAddress = 'wallet-123';
      const tokenAddress = 'So11111111111111111111111111111111111111112';
      const requiredAmount = new Decimal(10);
      const currentBalance = new Decimal(10);
      
      mockRepository.findByWalletAddressAndTokenAddress = jest.fn().mockResolvedValue({
        id: 'balance-123',
        agentId,
        walletAddress,
        tokenAddress,
        tokenSymbol: 'SOL',
        balance: currentBalance,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Act
      const result = await balanceService.validateSufficientBalance(
        walletAddress,
        tokenAddress,
        requiredAmount
      );
      
      // Assert
      expect(result.toNumber()).toBe(10);
    });
  });
});

