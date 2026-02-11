# Integration Tests Summary

## Overview

Integration tests verify interactions between components using real infrastructure (PostgreSQL, Redis) while mocking external APIs (Jupiter, Pyth, token metadata). They run with `--runInBand` to avoid resource contention and include global teardown to close singletons cleanly.

## Test Statistics

- **Total Test Files**: 13
- **Total Test Cases**: ~101
- **Coverage Areas**: Redis cache, distributed locking, idempotency, repositories, services (position, agent, trading-executor), queue worker, cache warmer

## Test Helpers

#### `tests/helpers/test-db.ts`

| Function | Purpose |
|----------|---------|
| `getTestPrisma()` | Get or create test Prisma client (uses `DATABASE_TEST_URL`) |
| `cleanupTestDatabase(prisma)` | Clean up all test data from database |
| `disconnectTestDatabase()` | Disconnect from test database |

**Safety**: Requires `DATABASE_TEST_URL` or a database name containing `test` to prevent accidental data loss.

#### `tests/helpers/test-redis.ts`

| Function | Purpose |
|----------|---------|
| `getTestRedis()` | Get or create test Redis client (uses db 1 by default) |
| `connectTestRedis()` | Connect to test Redis |
| `cleanupTestRedis(redis)` | Flush test Redis database |
| `disconnectTestRedis()` | Disconnect from test Redis |

#### `tests/helpers/test-factory.ts`

Shared with unit tests; provides `createMockPosition()`, `createMockConfig()`, etc., for integration test data.

#### `tests/integration/jest.setup.ts`

- Sets `REDIS_DB=1` before imports
- Registers `globalTeardown` to close queue workers, queue client, and Redis after each file
- Ensures process exits cleanly without `forceExit`

## Test Files

### Redis Cache

| File | Service | Key Coverage |
|------|---------|--------------|
| `redis-position-service.integration.test.ts` | RedisPositionService | Position caching, indexes, serialization |
| `redis-balance-service.integration.test.ts` | RedisBalanceService | Balance caching, invalidation |
| `redis-config-service.integration.test.ts` | RedisConfigService | Config caching, nested structures |
| `redis-locking.integration.test.ts` | RedisService | Distributed locking (acquire, release, TTL) |
| `idempotency-service.integration.test.ts` | IdempotencyService | `checkAndSet`, deduplication, concurrency |

### Repositories

| File | Repository | Key Coverage |
|------|------------|--------------|
| `position.repository.test.ts` | PositionRepository | Create, find, update, delete, transactions |
| `balance.repository.test.ts` | BalanceRepository | Upsert, find, locking |
| `agent.repository.test.ts` | AgentRepository | Create, find, update, delete, wallet lookup |

### Services

| File | Service | Key Coverage |
|------|---------|--------------|
| `position-service.integration.test.ts` | PositionService | Create/update positions, Redis + DB, fallback |
| `agent-service.integration.test.ts` | AgentService | Create agent, write-through cache sync |
| `trading-executor.integration.test.ts` | TradingExecutorService | `executePurchase` with real Prisma + Redis; mocks Jupiter, token metadata, Pyth, queue |

### Queue & Cache Warming

| File | Component | Key Coverage |
|------|-----------|--------------|
| `queue-worker.integration.test.ts` | QueueWorker | Initialization, `WRITE_HISTORICAL_SWAP` job processing and DB persistence |
| `cache-warmer.integration.test.ts` | CacheWarmer | Warm agent configs, positions, balances, active agents set |

**Note**: Most write operations use write-through (DB first, then Redis). Async jobs like `WRITE_HISTORICAL_SWAP` are processed by the queue worker.

## Running Tests

```bash
# Run all integration tests (includes db:test:migrate)
pnpm test:integration

# Or with full test suite
pnpm test tests/integration

# Run specific file
pnpm test tests/integration/cache/redis-position-service.integration.test.ts

# Run with coverage
pnpm test --coverage tests/integration
```

## Test Environment Setup

### Prerequisites

1. **Test database**: Set `DATABASE_TEST_URL` in `packages/backend/.env`
2. **Test Redis**: Use same Redis as dev, or set `REDIS_TEST_URL` (tests use db 1)

### One-time: Create test database and run migrations

**Step 1: Create the test database** (Docker Postgres: `docker-compose up -d`)

```bash
docker exec -it nexgent-postgres psql -U postgres -c "CREATE DATABASE nexgent_test;"
```

To reset: `DROP DATABASE IF EXISTS nexgent_test; CREATE DATABASE nexgent_test;`

**Step 2: Apply migrations**

From repo root:

```bash
pnpm --filter backend db:test:migrate
```

Or from `packages/backend`:

```bash
cd packages/backend && pnpm db:test:migrate
```

**Step 3: Run tests**

```bash
pnpm test:integration
# or full suite: pnpm test
```

### Environment Variables

```env
DATABASE_TEST_URL="postgresql://user:password@localhost:5432/nexgent_test"
REDIS_TEST_URL="redis://localhost:6379/1"
```

## Test Patterns

1. **Real infrastructure**: Tests use real PostgreSQL and Redis
2. **Isolation**: Each test cleans up in `beforeEach` (database + Redis)
3. **Test data**: Minimal seed data (user, agent, wallet) created per test
4. **Mocking**: External APIs (Jupiter, DexScreener, Pyth, token metadata) mocked
5. **Async**: Polling or timeouts for queue job completion

## Known Limitations

1. **Queue worker**: Must be initialized; tests poll for job completion (up to ~10s for WRITE_HISTORICAL_SWAP)
2. **Database**: Use a dedicated test database; tests clean all data
3. **Redis**: Uses db 1; tests flush it; ensure multiple DBs are enabled

## References

- Unit tests: `tests/UNIT_TESTS_SUMMARY.md`
- Jest config: `jest.config.ts` (forceExit: false, globalTeardown)
- Testing strategy: `docs/TESTING_STRATEGY.md` (if present)
