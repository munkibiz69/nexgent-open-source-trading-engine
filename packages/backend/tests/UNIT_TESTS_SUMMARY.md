# Unit Tests Summary

## Overview

This document summarizes the unit tests for the backend. These tests focus on business logic validation, ensuring that core trading operations work correctly in isolation with mocked external dependencies (Redis, database, external APIs).

## Test Statistics

- **Total Test Files**: 22
- **Total Test Cases**: ~381
- **Coverage Areas**: Domain (trading, signals, agents, balances, prices), infrastructure (Jupiter), shared utilities (auth, timeout, calculators)

## Test Helpers

#### `tests/helpers/test-factory.ts`

Factory functions for creating test data:

| Function | Purpose |
|----------|---------|
| `createMockSignal()` | Mock trading signals (includes userId for eligibility tests) |
| `createMockConfig()` | Mock agent trading configurations |
| `createMockPosition()` | Mock open positions |
| `createMockPositionWithDCA()` | Mock positions with DCA state |
| `createMockPositionForStaleTrade()` | Mock "old" positions for stale-trade tests |
| `createMockAgentId()` | Generate mock agent IDs |
| `createMockWalletAddress()` | Generate Base58 wallet addresses |
| `createMockDCAConfig()` | Mock DCA configuration |
| `createMockDCALevel()` | Mock DCA level |
| `createMockTakeProfitConfig()` | Mock take-profit configuration |
| `createMockStaleTradeConfig()` | Mock stale-trade configuration |

## Test Files

### Domain Layer — Trading

| File | Service | Key Coverage |
|------|---------|--------------|
| `config-service.test.ts` | ConfigService | Config loading, validation, merging, Redis fallback |
| `dca-manager.service.test.ts` | DCAManagerService | DCA levels, cooldowns, buy logic, max count |
| `jupiter-fee-calculator.test.ts` | JupiterFeeCalculator | Fee calculation from Jupiter response |
| `pnl-calculator.test.ts` | PNLCalculator | PnL calculation for positions |
| `position-calculator.service.test.ts` | PositionCalculator | Position sizing by balance category, randomization, limits |
| `position-service.test.ts` | PositionService | Position CRUD, Redis/DB coordination, conversion helpers |
| `stop-loss-manager.service.test.ts` | StopLossManager | Stop loss evaluation, trailing levels, peak tracking |
| `take-profit-manager.service.test.ts` | TakeProfitManager | Take-profit levels, moon bag, partial sells |
| `trade-validator.service.test.ts` | TradeValidatorService | Balance checks, validation rules |
| `trading-executor.service.test.ts` | TradingExecutorService | Purchase flow, slippage retries, validation |

### Domain Layer — Signals

| File | Service | Key Coverage |
|------|---------|--------------|
| `agent-eligibility.service.test.ts` | AgentEligibilityService | Signal strength, blacklist/whitelist, multi-agent |
| `execution-tracker.service.test.ts` | ExecutionTrackerService | Execution creation, deduplication, DB errors |
| `signal-processor.service.test.ts` | SignalProcessor | Event-driven processing, eligible agents, failures |

### Domain Layer — Agents & Balances

| File | Service | Key Coverage |
|------|---------|--------------|
| `agent-service.test.ts` | AgentService | Agent CRUD, config handling |
| `balance-service.test.ts` | BalanceService | Balance deltas (DEPOSIT, SWAP, BURN), validation |

### Domain Layer — Prices

| File | Service | Key Coverage |
|------|---------|--------------|
| `price-update-manager.test.ts` | PriceUpdateManager | Price refresh, DCA/stop-loss evaluation triggers |

### Infrastructure Layer

| File | Service | Key Coverage |
|------|---------|--------------|
| `jupiter-token-metrics.service.test.ts` | JupiterTokenMetricsService | Token metrics fetch, API error handling |

### Shared Layer

| File | Module | Key Coverage |
|------|--------|--------------|
| `take-profit-calculator.test.ts` | Take-profit calculator | Level calculations, percentages |
| `account-lockout.test.ts` | Account lockout utils | `isAccountLocked`, `getLockoutInfo`, `incrementFailedAttempts`, `resetFailedAttempts` |
| `jwt.test.ts` | JWT utilities | Token creation, verification |
| `password.test.ts` | Password utilities | Hashing, verification |
| `timeout.test.ts` | Timeout utility | Timeout wrapper behavior |

## Running Tests

```bash
# Run all unit tests
pnpm test:unit

# Or with pattern
pnpm test tests/unit

# Run specific test file
pnpm test tests/unit/domain/trading/stop-loss-manager.service.test.ts

# Run with coverage
pnpm test --coverage tests/unit
```

## Test Patterns

1. **Arrange-Act-Assert (AAA)**: All tests follow this pattern
2. **Mocking**: External dependencies mocked (Redis, DB, config services, external APIs)
3. **Factory Functions**: Test data created via `test-factory.ts` for consistency
4. **Edge Cases**: Boundary conditions and error scenarios covered
5. **Isolation**: Each test is independent and can run in any order

## Testing Notes

1. **Singleton Services**: Some domain services use singletons. Tests use `as any` type assertions where needed to access internals or inject mocks; this is a deliberate testing approach, not a production workaround.
2. **Mock Maintenance**: Mocks are updated as implementation evolves.
3. **Integration Boundaries**: Tests that require real infrastructure (DB, Redis) live in `tests/integration/`.

## References

- Jest with TypeScript
- Testing strategy: `docs/TESTING_STRATEGY.md` (if present)
- Integration tests: `tests/INTEGRATION_TESTS_SUMMARY.md`
