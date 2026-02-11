import { extractJupiterFees } from '@/domain/trading/jupiter-fee-calculator.js';

describe('extractJupiterFees', () => {
  // Example payload from the user's real swap (sell token → SOL)
  const fullPayload = {
    orderResponse: {
      mode: 'ultra',
      feeBps: 10,
      feeMint: 'So11111111111111111111111111111111111111112',
      inAmount: '36614551686',
      outAmount: '308151371',
      inputMint: '86WM5NBUtRWTHULKrspS1TdzVFAcZ9buXsGRAiFDpump',
      outputMint: 'So11111111111111111111111111111111111111112',
      platformFee: {
        feeBps: 10,
        feeMint: 'So11111111111111111111111111111111111111112',
      },
      signatureFeeLamports: 5000,
      prioritizationFeeLamports: 336158,
      rentFeeLamports: 0,
      swapUsdValue: 26.73605129537983,
    },
    executeResponse: {
      code: 0,
      status: 'Success',
      signature: 'ejTNUT9DsqDDJFXi9emjwvBqeetod5P3wTWVgdf3RZPuBJJHotiKopyt7NguwCLVtrZp4WgqwAeVniHkNdik3Yw',
      totalInputAmount: '36614551686',
      inputAmountResult: '36614551686',
      totalOutputAmount: '308151371',
      outputAmountResult: '308459830',
    },
  };

  it('should extract fees from a full live payload (sell token → SOL)', () => {
    const fees = extractJupiterFees(fullPayload);

    // Protocol fee: outputAmountResult (308459830) × 10/10000 = 308459.83 lamports → ~0.00030846 SOL
    expect(fees.protocolFeeSol).toBeCloseTo(0.000308, 5);
    expect(fees.protocolFeeSol).not.toBeNull();

    // Network fee: 5000 + 336158 + 0 = 341158 lamports → 0.000341158 SOL
    expect(fees.networkFeeSol).toBeCloseTo(0.000341158, 9);
  });

  it('should extract fees from simulation (orderResponse only, no executeResponse)', () => {
    const simulationPayload = {
      orderResponse: fullPayload.orderResponse,
      // no executeResponse
    };

    const fees = extractJupiterFees(simulationPayload);

    // Protocol fee: uses outAmount from quote (308151371) × 10/10000 = 308151.371 → ~0.000308151 SOL
    expect(fees.protocolFeeSol).toBeCloseTo(0.000308, 5);
    expect(fees.protocolFeeSol).not.toBeNull();

    // Network fee is the same (from orderResponse)
    expect(fees.networkFeeSol).toBeCloseTo(0.000341158, 9);
  });

  it('should handle legacy flat payload (just the quote object)', () => {
    // Simulation where swapPayload is the quote directly (no { orderResponse } wrapper)
    const legacyPayload = fullPayload.orderResponse;

    const fees = extractJupiterFees(legacyPayload);

    // Protocol fee: uses outAmount from the flat object
    expect(fees.protocolFeeSol).toBeCloseTo(0.000308, 5);

    // Network fee
    expect(fees.networkFeeSol).toBeCloseTo(0.000341158, 9);
  });

  it('should return null for both fees when payload is null/undefined', () => {
    expect(extractJupiterFees(null)).toEqual({ protocolFeeSol: null, networkFeeSol: null });
    expect(extractJupiterFees(undefined)).toEqual({ protocolFeeSol: null, networkFeeSol: null });
  });

  it('should return 0 protocol fee when feeBps is 0', () => {
    const noFeePayload = {
      orderResponse: {
        ...fullPayload.orderResponse,
        feeBps: 0,
        platformFee: { feeBps: 0, feeMint: 'So11111111111111111111111111111111111111112' },
      },
      executeResponse: fullPayload.executeResponse,
    };

    const fees = extractJupiterFees(noFeePayload);
    expect(fees.protocolFeeSol).toBe(0);
    expect(fees.networkFeeSol).toBeCloseTo(0.000341158, 9);
  });

  it('should return null protocol fee when fee mint is not SOL', () => {
    const nonSolFeePayload = {
      orderResponse: {
        ...fullPayload.orderResponse,
        feeMint: 'SomeOtherToken123',
        platformFee: { feeBps: 10, feeMint: 'SomeOtherToken123' },
      },
      executeResponse: fullPayload.executeResponse,
    };

    const fees = extractJupiterFees(nonSolFeePayload);
    expect(fees.protocolFeeSol).toBeNull();
  });

  it('should handle buy direction (SOL → token)', () => {
    // Buy: input is SOL, output is token
    const buyPayload = {
      orderResponse: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: '86WM5NBUtRWTHULKrspS1TdzVFAcZ9buXsGRAiFDpump',
        inAmount: '300000000', // 0.3 SOL in lamports
        outAmount: '36614551686',
        platformFee: {
          feeBps: 10,
          feeMint: 'So11111111111111111111111111111111111111112',
        },
        signatureFeeLamports: 5000,
        prioritizationFeeLamports: 100000,
        rentFeeLamports: 0,
      },
      executeResponse: {
        inputAmountResult: '300000000',
        outputAmountResult: '36614551686',
        totalInputAmount: '300030000', // includes protocol fee
        totalOutputAmount: '36614551686',
      },
    };

    const fees = extractJupiterFees(buyPayload);

    // Protocol fee: inputAmountResult (300000000) × 10/10000 = 300000 → 0.0003 SOL
    expect(fees.protocolFeeSol).toBeCloseTo(0.0003, 7);

    // Network fee: 5000 + 100000 + 0 = 105000 lamports → 0.000105 SOL
    expect(fees.networkFeeSol).toBeCloseTo(0.000105, 9);
  });

  it('should handle missing network fee fields gracefully', () => {
    const minimalPayload = {
      orderResponse: {
        inputMint: '86WM5NBUtRWTHULKrspS1TdzVFAcZ9buXsGRAiFDpump',
        outputMint: 'So11111111111111111111111111111111111111112',
        inAmount: '36614551686',
        outAmount: '308151371',
        platformFee: {
          feeBps: 10,
          feeMint: 'So11111111111111111111111111111111111111112',
        },
        // no signatureFeeLamports, prioritizationFeeLamports, rentFeeLamports
      },
    };

    const fees = extractJupiterFees(minimalPayload);
    expect(fees.protocolFeeSol).toBeCloseTo(0.000308, 5);
    expect(fees.networkFeeSol).toBe(0); // all default to 0
  });
});
