/**
 * API Router Aggregation
 * 
 * Aggregates all API version routers for use in Express app.
 * This provides a single entry point for all API routes.
 */

import { Router } from 'express';
import { agentRoutes } from './v1/agents/index.js';
import { agentBalanceRoutes } from './v1/agent-balances/index.js';
import { agentTransactionRoutes } from './v1/agent-transactions/index.js';
import { agentHistoricalSwapRoutes } from './v1/agent-historical-swaps/index.js';
import { agentPositionRoutes } from './v1/agent-positions/index.js';
import { apiKeyRoutes } from './v1/api-keys/index.js';
import { authRoutes } from './v1/auth/index.js';
import { tradingSignalRoutes } from './v1/trading-signals/index.js';
import { tradeRoutes } from './v1/trades/index.js';
import { walletRoutes } from './v1/wallets/index.js';
import webhookRoutes from './v1/webhooks/index.js';
import { priceFeedRoutes } from './v1/price-feeds/index.js';
import { dataSourceRoutes } from './v1/data-sources/index.js';
import healthRoutes from './v1/health/routes.js';
import metricsRoutes from './v1/metrics/routes.js';

const router = Router();

// Mount all v1 API routes
router.use('/v1/agents', agentRoutes);
router.use('/v1/agent-balances', agentBalanceRoutes);
router.use('/v1/agent-transactions', agentTransactionRoutes);
router.use('/v1/agent-historical-swaps', agentHistoricalSwapRoutes);
router.use('/v1/agent-positions', agentPositionRoutes);
router.use('/v1/api-keys', apiKeyRoutes);
router.use('/v1/auth', authRoutes);
router.use('/v1/trading-signals', tradingSignalRoutes);
router.use('/v1/trades', tradeRoutes);
router.use('/v1/wallets', walletRoutes);
router.use('/v1/webhooks', webhookRoutes);
router.use('/v1/price-feeds', priceFeedRoutes);
router.use('/v1/data-sources', dataSourceRoutes);
router.use('/v1/health', healthRoutes);
router.use('/v1/metrics', metricsRoutes);

export default router;

