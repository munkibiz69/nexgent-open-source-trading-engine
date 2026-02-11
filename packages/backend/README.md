# @nexgent/backend

High-performance backend service for Nexgent AI - an ultra-low latency trading engine for Solana-based token trading. This service handles real-time data ingestion, signal processing, trade execution, position management, and WebSocket-based real-time updates.

## 🎯 Overview

The Nexgent backend is designed for **ultra-low latency** trading operations with the following performance targets:
- **Signal Processing**: Sub-100ms from signal creation to trade execution
- **Stop Loss Evaluation**: Sub-1ms in-memory evaluation
- **Stop Loss Execution**: Sub-500ms from trigger to on-chain execution
- **Price Updates**: Real-time SOL price via Pyth Network SSE WebSocket; 1-second polling for other tokens with WebSocket broadcasts

The architecture follows **Domain-Driven Design (DDD)** principles with a **Layered Architecture** pattern, ensuring separation of concerns, testability, and maintainability.

## 🛠 Tech Stack

### Core Runtime & Framework
- **Node.js**: 18+ (ESM modules)
- **Express**: 4.18+ (HTTP server)
- **TypeScript**: 5.7+ (type safety)

### Database & ORM
- **PostgreSQL**: 14+ (primary database)
- **Prisma**: 5.19+ (ORM and migrations)

### Caching & Queues
- **Redis**: 6.0+ (in-memory cache, job queues)
- **ioredis**: 5.3+ (Redis client)
- **BullMQ**: 5.65+ (job queue system)

### Authentication & Security
- **JWT**: JSON Web Tokens (access/refresh tokens)
- **bcrypt**: 5.1+ (password hashing)
- **Zod**: 3.25+ (runtime validation)

### Real-Time Communication
- **ws**: 8.16+ (WebSocket server)
- **EventEmitter**: In-memory event system

### External Integrations
- **@solana/web3.js**: 1.87+ (Solana blockchain interaction)
- **Jupiter Aggregator API**: Token swap execution
- **DexScreener API**: Token price feeds
- **Pyth Network**: Real-time price oracles

### Observability
- **pino**: 8.17+ (structured logging)
- **prom-client**: 15.1+ (Prometheus metrics)

## 📁 Complete Project Structure

```
packages/backend/
├── src/                                    # Source code root
│   ├── api/                                # API Layer (HTTP endpoints)
│   │   ├── index.ts                        # Main API router aggregation
│   │   └── v1/                             # Versioned API routes (v1)
│   │       ├── admin/                      # Admin endpoints
│   │       │   ├── handlers/
│   │       │   │   └── cache-reset.ts      # Cache management (clear/warm)
│   │       │   └── routes.ts               # Admin route definitions
│   │       ├── agent-balances/             # Agent balance management
│   │       │   ├── handlers/               # CRUD handlers
│   │       │   │   ├── create.ts
│   │       │   │   ├── get.ts
│   │       │   │   ├── list.ts
│   │       │   │   ├── update.ts
│   │       │   │   └── delete.ts
│   │       │   ├── routes.ts
│   │       │   ├── types.ts                # TypeScript types
│   │       │   └── index.ts                # Module exports
│   │       ├── agent-historical-swaps/     # Completed trade history
│   │       ├── agent-positions/            # Position management
│   │       │   ├── handlers/
│   │       │   │   ├── get.ts              # Get positions
│   │       │   │   └── close.ts             # Manual position closure
│   │       │   └── routes.ts
│   │       ├── agent-transactions/          # Transaction records
│   │       ├── agents/                      # Agent CRUD operations
│   │       │   ├── handlers/
│   │       │   │   ├── config/             # Trading configuration
│   │       │   │   │   ├── get.ts
│   │       │   │   │   ├── update.ts
│   │       │   │   │   └── ...
│   │       │   │   ├── create.ts
│   │       │   │   ├── get.ts
│   │       │   │   ├── list.ts
│   │       │   │   ├── update.ts
│   │       │   │   └── delete.ts
│   │       │   └── routes.ts
│   │       ├── auth/                        # Authentication endpoints
│   │       │   ├── handlers/
│   │       │   │   ├── login.ts             # User login
│   │       │   │   ├── register.ts          # User registration
│   │       │   │   ├── me.ts                # Get current user
│   │       │   │   └── tokens.ts            # Token refresh
│   │       │   └── routes.ts
│   │       ├── data-sources/                # Data source management
│   │       ├── health/                      # Health check endpoints
│   │       │   ├── handlers/
│   │       │   │   ├── health.ts            # Full health status
│   │       │   │   ├── ready.ts             # Readiness probe
│   │       │   │   └── live.ts              # Liveness probe
│   │       │   └── routes.ts
│   │       ├── metrics/                     # Prometheus metrics
│   │       │   ├── handlers/
│   │       │   │   └── get.ts               # GET /api/v1/metrics
│   │       │   └── routes.ts
│   │       ├── price-feeds/                 # Price feed endpoints
│   │       ├── trades/                      # Trade execution
│   │       │   ├── handlers/
│   │       │   │   └── execute.ts          # Manual trade execution
│   │       │   └── index.ts
│   │       ├── trading-signals/             # Trading signal management
│   │       │   ├── handlers/
│   │       │   │   ├── create.ts            # Create signal (triggers processing)
│   │       │   │   ├── get.ts
│   │       │   │   ├── list.ts
│   │       │   │   ├── update.ts
│   │       │   │   └── delete.ts
│   │       │   └── routes.ts
│   │       ├── wallets/                      # Wallet management
│   │       │   ├── handlers/
│   │       │   │   ├── create.ts            # Create encrypted wallet
│   │       │   │   ├── list.ts               # List user wallets
│   │       │   │   ├── unlock.ts             # Unlock wallet (decrypt key)
│   │       │   │   ├── lock.ts               # Lock wallet (clear from memory)
│   │       │   │   ├── status.ts             # Wallet status
│   │       │   │   ├── export.ts             # Export wallet (dangerous)
│   │       │   │   └── delete.ts
│   │       │   ├── helpers.ts                # Wallet helper functions
│   │       │   └── routes.ts
│   │       └── webhooks/                     # Webhook endpoints
│   │           ├── handlers/
│   │           │   └── test.ts               # Test webhook (dev only)
│   │           └── index.ts
│   │
│   ├── config/                              # Configuration Layer
│   │   ├── app.config.ts                    # Application config (PORT, NODE_ENV, LOG_LEVEL)
│   │   ├── redis.config.ts                  # Redis connection config
│   │   └── index.ts                          # Config exports
│   │
│   ├── domain/                               # Domain Layer (Business Logic)
│   │   ├── agents/                           # Agent domain logic
│   │   │   └── agent.repository.ts           # Agent repository interface
│   │   ├── balances/                         # Balance management
│   │   │   ├── balance-service.ts            # Balance business logic
│   │   │   ├── balance.repository.ts         # Balance repository interface
│   │   │   └── index.ts
│   │   ├── positions/                        # Position management
│   │   │   └── position.repository.ts         # Position repository interface
│   │   ├── prices/                           # Price feed management
│   │   │   ├── price-update-manager.ts       # Price polling & stop loss evaluation
│   │   │   └── index.ts
│   │   ├── signals/                          # Trading signal processing
│   │   │   ├── signal-events.ts              # In-memory event emitter
│   │   │   ├── signal-processor.service.ts   # Signal orchestration
│   │   │   ├── agent-eligibility.service.ts  # Agent eligibility checks
│   │   │   └── execution-tracker.service.ts  # Signal execution tracking
│   │   ├── trading/                          # Trading engine core
│   │   │   ├── trading-executor.service.ts   # Trade execution orchestration
│   │   │   ├── trade-validator.service.ts     # Pre-trade validation
│   │   │   ├── position-service.ts           # Position CRUD & calculations
│   │   │   ├── position-calculator.service.ts # P/L calculations
│   │   │   ├── stop-loss-manager.service.ts  # Stop loss evaluation & updates
│   │   │   ├── config-service.ts             # Trading config management
│   │   │   ├── position-events.ts            # Position event emitter
│   │   │   └── index.ts
│   │   └── transactions/                     # Transaction domain
│   │       └── transaction.repository.ts     # Transaction repository interface
│   │
│   ├── infrastructure/                       # Infrastructure Layer (Implementations)
│   │   ├── cache/                            # Redis caching layer
│   │   │   ├── redis-client.ts               # Redis connection & base operations
│   │   │   ├── redis-position-service.ts     # Position caching
│   │   │   ├── redis-balance-service.ts      # Balance caching
│   │   │   ├── redis-config-service.ts       # Agent config caching
│   │   │   ├── redis-price-service.ts        # Price caching
│   │   │   ├── redis-agent-service.ts        # Agent caching
│   │   │   ├── redis-token-service.ts        # Token metadata caching
│   │   │   ├── idempotency-service.ts        # Idempotency checks for operations
│   │   │   └── cache-warmer.ts               # Cache warmup on startup
│   │   ├── database/                         # Database layer
│   │   │   ├── client.ts                     # Prisma client singleton
│   │   │   ├── schema.prisma                 # Prisma schema definition
│   │   │   ├── migrations/                   # Database migrations
│   │   │   │   └── [timestamp]_[name].sql
│   │   │   └── repositories/                 # Repository implementations
│   │   │       ├── agent.repository.ts       # Agent data access
│   │   │       ├── balance.repository.ts     # Balance data access
│   │   │       ├── position.repository.ts    # Position data access
│   │   │       └── transaction.repository.ts # Transaction data access
│   │   ├── external/                         # External service integrations
│   │   │   ├── dexscreener/                  # DexScreener price feeds
│   │   │   │   ├── dexscreener-price-provider.ts
│   │   │   │   ├── base-price-provider.ts    # Abstract base class
│   │   │   │   ├── price-feed-service.ts     # Price feed orchestration
│   │   │   │   └── types.ts
│   │   │   ├── jupiter/                      # Jupiter swap aggregator
│   │   │   │   ├── jupiter-swap-provider.ts  # Swap execution
│   │   │   │   ├── base-swap-provider.ts     # Abstract base class
│   │   │   │   ├── swap-service.ts           # Swap orchestration
│   │   │   │   └── types.ts
│   │   │   ├── pyth/                         # Pyth Network price oracles
│   │   │   │   ├── price-service.ts
│   │   │   │   └── index.ts
│   │   │   └── solana/                       # Solana blockchain
│   │   │       └── token-metadata-service.ts  # Token metadata fetching
│   │   ├── logging/                          # Logging infrastructure
│   │   │   └── logger.ts                     # Pino logger configuration
│   │   ├── metrics/                          # Prometheus metrics
│   │   │   └── metrics.ts                    # Metric definitions & registry
│   │   ├── queue/                            # Job queue system
│   │   │   ├── queue-client.ts               # BullMQ queue client
│   │   │   ├── queue-worker.ts               # Job processor
│   │   │   └── job-types.ts                  # Job type definitions
│   │   ├── wallets/                          # Wallet infrastructure
│   │   │   ├── wallet-store.ts               # In-memory wallet key store
│   │   │   ├── wallet-service.ts             # Wallet encryption/decryption
│   │   │   └── index.ts
│   │   └── websocket/                        # WebSocket server
│   │       └── server.ts                     # WebSocket server implementation
│   │
│   ├── middleware/                           # Express middleware
│   │   ├── auth.ts                           # JWT authentication middleware
│   │   ├── error-handler.ts                  # Global error handler
│   │   ├── rate-limiter.ts                   # Rate limiting middleware
│   │   ├── request-logger.ts                 # Request logging & metrics
│   │   └── validation.ts                     # Request validation middleware
│   │
│   ├── shared/                               # Backend-internal shared code
│   │   ├── constants/
│   │   │   └── redis-keys.ts                 # Redis key patterns
│   │   ├── errors/
│   │   │   ├── base.error.ts                 # Base error class
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── auth/                         # Authentication utilities
│   │       │   ├── jwt.ts                    # JWT token generation/verification
│   │       │   ├── password.ts               # Password hashing/verification
│   │       │   ├── account-lockout.ts        # Account lockout logic
│   │       │   └── types.ts
│   │       └── timeout.ts                    # Promise timeout utility
│   │
│   └── index.ts                              # Application entry point
│
├── tests/                                    # Test suite
│   ├── unit/                                 # Unit tests (domain, infrastructure, shared)
│   ├── integration/                          # Integration tests (Redis, DB, services, queue)
│   ├── helpers/                              # Test utilities (test-db, test-redis, test-factory)
│   ├── UNIT_TESTS_SUMMARY.md
│   └── INTEGRATION_TESTS_SUMMARY.md
│
├── postman/                                  # API documentation
│   ├── Nexgent-API.postman_collection.json  # Postman collection
│   ├── Nexgent-API.postman_environment.json # Postman environment
│   └── README.md                             # API documentation
│
├── scripts/                                  # Utility scripts
│   └── webhook-tunnel.js                     # Webhook tunneling (dev)
│
├── env.example                               # Environment variable template
├── package.json                              # Dependencies & scripts
├── tsconfig.json                             # TypeScript configuration
├── jest.config.ts                            # Jest test configuration
└── README.md                                 # This file
```

## 🏗 Architecture

### Layered Architecture Pattern

The backend follows a **strict layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│         API Layer (HTTP)                │  ← Handles HTTP requests/responses
│  (Routes, Handlers, Validation)        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Domain Layer (Business Logic)      │  ← Core business rules
│  (Services, Repository Interfaces)     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Infrastructure Layer (Implementations)│  ← External concerns
│  (Database, Cache, External APIs)      │
└─────────────────────────────────────────┘
```

### Key Design Principles

1. **Dependency Inversion**: Domain layer defines interfaces; infrastructure implements them
2. **Single Responsibility**: Each service/class has one clear purpose
3. **Event-Driven**: Services communicate via events where appropriate
4. **Write-Through Caching**: Redis for hot data, async DB writes via queues
5. **Ultra-Low Latency**: In-memory operations for critical paths

### Data Flow Patterns

#### Signal Processing Flow
```
Trading Signal Created (API)
  → Emit 'signal_created' event
  → Signal Processor listens
  → Check agent eligibility (Redis cache)
  → For each eligible agent:
      → Validate trade preconditions
      → Execute trade (Trading Executor)
      → Update positions (Redis + async DB)
      → Track execution (Redis + async DB)
```

#### Price Update Flow
```
Price Update Manager (1s polling)
  → Fetch prices from DexScreener
  → Cache in Redis
  → For each token with positions:
      → Evaluate stop loss (in-memory)
      → If triggered: Execute sale
  → Broadcast via WebSocket
```

#### Trade Execution Flow
```
Trade Execution Request
  → Validate (wallet, balance, config)
  → Get swap quote (Jupiter API)
  → Execute swap (simulation or live)
  → Update balance (Redis + async DB)
  → Create position (Redis + async DB)
  → Create transaction (async DB)
  → Broadcast via WebSocket
```

## 🔑 Key Services & Responsibilities

### Domain Services

#### `TradingExecutorService`
- **Purpose**: Orchestrates trade execution (buy/sell)
- **Responsibilities**:
  - Coordinates swap execution via Jupiter
  - Manages position creation/closure
  - Updates balances (Redis + async DB)
  - Creates transaction records
- **Location**: `src/domain/trading/trading-executor.service.ts`

#### `SignalProcessorService`
- **Purpose**: Processes trading signals and triggers trades
- **Responsibilities**:
  - Listens to `signal_created` events
  - Determines eligible agents
  - Triggers trade execution for each agent
  - Tracks signal execution status
- **Location**: `src/domain/signals/signal-processor.service.ts`

#### `StopLossManagerService`
- **Purpose**: Evaluates and updates stop loss levels
- **Responsibilities**:
  - In-memory stop loss evaluation (<1ms)
  - Trailing stop loss calculation
  - Triggers sale when stop loss hit
- **Location**: `src/domain/trading/stop-loss-manager.service.ts`

#### `PriceUpdateManager`
- **Purpose**: Polls price feeds and evaluates stop losses
- **Responsibilities**:
  - Polls DexScreener every 1 second
  - Caches prices in Redis
  - Triggers stop loss evaluation
  - Broadcasts updates via WebSocket
- **Location**: `src/domain/prices/price-update-manager.ts`

#### `PositionService`
- **Purpose**: Manages position lifecycle
- **Responsibilities**:
  - CRUD operations (Redis primary, DB async)
  - P/L calculations
  - Position state management
- **Location**: `src/domain/trading/position-service.ts`

#### `BalanceService`
- **Purpose**: Manages agent balances
- **Responsibilities**:
  - Balance updates (Redis + async DB)
  - Balance locking for trades
  - Validation of sufficient funds
- **Location**: `src/domain/balances/balance-service.ts`

### Infrastructure Services

#### `RedisService` (Base)
- **Purpose**: Redis connection and base operations
- **Location**: `src/infrastructure/cache/redis-client.ts`

#### `RedisPositionService`
- **Purpose**: Position caching in Redis
- **Features**: Indexes by agent ID and token address
- **Location**: `src/infrastructure/cache/redis-position-service.ts`

#### `QueueWorker`
- **Purpose**: Processes async database writes
- **Job Types**: Position updates, balance updates, transaction creation
- **Location**: `src/infrastructure/queue/queue-worker.ts`

#### `WebSocketServer`
- **Purpose**: Real-time communication with frontend
- **Message Types**: `connected`, `initial_data`, `position_update`, `price_update`, `price_update_batch`
- **Location**: `src/infrastructure/websocket/server.ts`


## 📝 Best Practices for Adding Features

### Adding a New API Endpoint

1. **Create Handler** (`src/api/v1/[resource]/handlers/[action].ts`):
   ```typescript
   import { Request, Response } from 'express';
   import { authenticate } from '@/middleware/auth.js';
   
   export async function createResourceHandler(
     req: AuthenticatedRequest,
     res: Response
   ): Promise<void> {
     // 1. Validate request (use Zod schemas from @nexgent/shared)
     // 2. Call domain service
     // 3. Return response
   }
   ```

2. **Create Routes** (`src/api/v1/[resource]/routes.ts`):
   ```typescript
   import { Router } from 'express';
   import { authenticate } from '@/middleware/auth.js';
   import { createResourceHandler } from './handlers/create.js';
   
   const router = Router();
   router.post('/', authenticate, createResourceHandler);
   export default router;
   ```

3. **Register Route** (`src/api/v1/index.ts`):
   ```typescript
   import resourceRoutes from './[resource]/routes.js';
   router.use('/[resource]', resourceRoutes);
   ```

### Adding a New Domain Service

1. **Create Service** (`src/domain/[domain]/[service].service.ts`):
   ```typescript
   import { IRepository } from './repository.ts';
   
   export class MyService {
     constructor(private repository: IRepository) {}
     
     async doSomething(): Promise<void> {
       // Business logic here
     }
   }
   ```

2. **Create Repository Interface** (`src/domain/[domain]/repository.ts`):
   ```typescript
   export interface IMyRepository {
     findById(id: string): Promise<MyEntity | null>;
     // ... other methods
   }
   ```

3. **Implement Repository** (`src/infrastructure/database/repositories/my.repository.ts`):
   ```typescript
   import { IMyRepository } from '@/domain/[domain]/repository.js';
   import { prisma } from '@/infrastructure/database/client.js';
   
   export class MyRepository implements IMyRepository {
     async findById(id: string): Promise<MyEntity | null> {
       // Prisma implementation
     }
   }
   ```

### Adding Redis Caching

1. **Create Redis Service** (`src/infrastructure/cache/redis-[resource]-service.ts`):
   ```typescript
   import { redisService } from './redis-client.js';
   import { REDIS_KEYS } from '@/shared/constants/redis-keys.js';
   
   export class RedisResourceService {
     async get(id: string): Promise<Resource | null> {
       const key = `${REDIS_KEYS.RESOURCE}:${id}`;
       const data = await redisService.get(key);
       return data ? JSON.parse(data) : null;
     }
     
     async set(resource: Resource): Promise<void> {
       const key = `${REDIS_KEYS.RESOURCE}:${resource.id}`;
       await redisService.set(key, JSON.stringify(resource), 'EX', 3600);
     }
   }
   ```

2. **Update Redis Keys** (`src/shared/constants/redis-keys.ts`):
   ```typescript
   export const REDIS_KEYS = {
     // ... existing keys
     RESOURCE: 'resource',
   };
   ```

### Adding Metrics

1. **Define Metric** (`src/infrastructure/metrics/metrics.ts`):
   ```typescript
   export const myOperationLatency = new Histogram({
     name: 'my_operation_latency_seconds',
     help: 'Time taken for my operation',
     labelNames: ['status'],
     buckets: [0.01, 0.05, 0.1, 0.5, 1],
     registers: [register],
   });
   ```

2. **Use in Service**:
   ```typescript
   const start = process.hrtime.bigint();
   // ... operation
   const end = process.hrtime.bigint();
   const duration = Number(end - start) / 1_000_000_000;
   myOperationLatency.observe({ status: 'success' }, duration);
   ```

### Adding Logging

Use structured logging with `pino`:

```typescript
import { logger } from '@/infrastructure/logging/logger.js';

logger.info({ userId, action: 'create_resource' }, 'Resource created');
logger.error({ error: error.message, context }, 'Operation failed');
logger.debug({ data }, 'Debug information');
```

### Code Organization Rules

1. **Never import from infrastructure in domain layer**
2. **Use path aliases**: `@/domain`, `@/api`, `@/infrastructure`, `@nexgent/shared`
3. **Keep handlers thin**: Delegate to domain services
4. **Use async/await**: Avoid callbacks
5. **Handle errors**: Use try/catch and return appropriate HTTP status codes
6. **Validate inputs**: Use Zod schemas from `@nexgent/shared`
7. **Cache hot data**: Use Redis for frequently accessed data
8. **Queue DB writes**: Use BullMQ for non-critical database operations

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **pnpm**: 8.0.0 or higher
- **PostgreSQL**: 14 or higher
- **Redis**: 6.0 or higher (required for caching and queues)

### Installation

```bash
# From monorepo root
pnpm install

# Generate Prisma Client
cd packages/backend
pnpm db:generate
```

### Environment Setup

1. **Copy environment template**:
   ```bash
   cp env.example .env
   ```

2. **Configure required variables** (see `env.example` for full list):
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/nexgent?schema=public"
   REDIS_HOST=localhost
   REDIS_PORT=6379
   JWT_SECRET="your-strong-random-secret-key-minimum-32-characters-long"
   PORT=4000
   NODE_ENV=development
   ```

3. **Generate JWT secret**:
   ```bash
   pnpm generate-secret:backend
   # Or from repo root: pnpm --filter backend generate-secret
   ```

### Database Setup

```bash
# Run migrations
pnpm db:migrate

# Or push schema (development only)
pnpm db:push

# Open Prisma Studio
pnpm db:studio
```

### Development

```bash
# Start development server with hot reload
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run tests
pnpm test

# Type check
pnpm type-check

# Lint
pnpm lint
```

## 🧪 Testing

### Test Structure

- **Unit Tests**: Test domain services, infrastructure, and shared utilities in isolation (mocked dependencies)
- **Integration Tests**: Test Redis, repositories, services, and queue worker with real database and Redis

### Running Tests

```bash
# All tests (migrates test DB, then runs unit + integration)
pnpm test

# Unit tests only (no DB/Redis required)
pnpm test:unit

# Integration tests only (requires DATABASE_TEST_URL, Redis)
pnpm test:integration

# Watch mode
pnpm test:unit --watch

# Coverage
pnpm test --coverage
```

See [tests/UNIT_TESTS_SUMMARY.md](./tests/UNIT_TESTS_SUMMARY.md) and [tests/INTEGRATION_TESTS_SUMMARY.md](./tests/INTEGRATION_TESTS_SUMMARY.md) for detailed coverage.

### Writing Tests

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { MyService } from '@/domain/my/my.service.js';

describe('MyService', () => {
  let service: MyService;
  
  beforeEach(() => {
    // Setup
  });
  
  it('should do something', async () => {
    // Test
  });
});
```

## 📊 Monitoring & Observability

### Health Checks

- **`GET /api/v1/health`**: Full health status (database, Redis, queue)
- **`GET /api/v1/health/ready`**: Readiness probe (Kubernetes)
- **`GET /api/v1/health/live`**: Liveness probe (Kubernetes)

### Metrics

- **`GET /api/v1/metrics`**: Prometheus metrics endpoint

**Key Metrics**:
- `signal_processing_latency_seconds`: Signal processing time
- `trade_execution_latency_seconds`: Trade execution time
- `stop_loss_evaluation_latency_seconds`: Stop loss evaluation time
- `price_update_latency_seconds`: Price update fetch time
- `api_request_latency_seconds`: API request latency
- `queue_depth`: Current queue depth
- `errors_total`: Error counts by type

### Logging

Structured logging with `pino`:
- **Levels**: `debug`, `info`, `warn`, `error`
- **Format**: JSON (production) or pretty (development)
- **Context**: Request IDs, user IDs, operation context

### Monitoring

The application exposes Prometheus metrics for monitoring system health and performance.
- High latency (signal processing, trade execution, etc.)
- High error rate
- Service connection failures (Redis, database, queue)
- Queue depth exceeded

## 🔒 Security Considerations

### Authentication

- JWT-based authentication with access/refresh tokens
- Access tokens: 15 minutes expiry
- Refresh tokens: 30 days expiry (with "remember me")
- Account lockout after 5 failed login attempts (15 minutes)

### Wallet Security

- Private keys encrypted at rest (AES-256)
- Keys decrypted in-memory only when unlocked
- Keys cleared from memory when locked
- Passphrase required for unlock operations

### API Security

- Rate limiting on all endpoints
- CORS configuration for allowed origins
- Input validation with Zod schemas
- SQL injection prevention (Prisma parameterized queries)

### Environment Variables

- Never commit `.env` files
- Use strong JWT secrets (32+ characters)
- Rotate secrets regularly in production
- Use different secrets for dev/staging/production

## 🚦 Performance Optimization

### Caching Strategy

- **Hot Data in Redis**: Positions, balances, agent configs, prices
- **Write-Through**: Updates go to Redis immediately, then async to DB
- **Cache Warming**: On startup, load active data into Redis
- **TTL**: Configurable TTL for cached data

### Async Operations

- **Database Writes**: Queued via BullMQ (non-blocking)
- **External API Calls**: Timeout protection (5-10s)
- **Parallel Operations**: Use `Promise.all` for independent operations

### WebSocket Optimization

- **Batch Updates**: Multiple price updates in single message
- **Selective Broadcasting**: Only send updates to relevant clients
- **Connection Management**: Automatic reconnection, heartbeat (ping/pong)

## 📚 Additional Documentation

- **[API Documentation](./postman/README.md)**: Postman collection and API reference
- **[Unit Tests](./tests/UNIT_TESTS_SUMMARY.md)**: Unit test coverage summary
- **[Integration Tests](./tests/INTEGRATION_TESTS_SUMMARY.md)**: Integration test coverage summary

## 🤝 Contributing

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Follow existing rules
- **Formatting**: Use Prettier (if configured)
- **Naming**: camelCase for variables, PascalCase for classes

### Commit Messages

Follow conventional commits:
- `feat: add new feature`
- `fix: fix bug`
- `docs: update documentation`
- `refactor: refactor code`
- `test: add tests`

### Pull Request Process

1. Create feature branch from `main`
2. Make changes following best practices
3. Add tests for new features
4. Update documentation if needed
5. Ensure all tests pass
6. Submit PR with clear description

## 📄 License

Nexgent AI Trading Engine
Copyright (C) 2026 Nexgent AI

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

Attribution Notice:
If you publicly deploy, distribute, or operate a modified or unmodified
version of this software, you must preserve the following attribution
in a reasonable and prominent location within the user interface or
documentation:

"Powered by Nexgent AI – https://nexgent.ai"

See the [LICENSE](../../LICENSE) file for the full GPL-3.0 license text.

## 🙏 Acknowledgments

- Built with [Express](https://expressjs.com/)
- Database powered by [Prisma](https://www.prisma.io/)
- Real-time updates via [WebSocket](https://github.com/websockets/ws)
- Monitoring with [Prometheus](https://prometheus.io/) metrics
