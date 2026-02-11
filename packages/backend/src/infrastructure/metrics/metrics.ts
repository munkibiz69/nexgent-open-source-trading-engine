/**
 * Prometheus Metrics
 * 
 * Collects and exposes metrics for monitoring and observability.
 */

import { Registry, Counter, Histogram, Gauge } from 'prom-client';

/**
 * Create a metrics registry
 */
const register = new Registry();

// Default metrics (CPU, memory, etc.)
// Note: We'll add custom metrics below

/**
 * Custom Metrics
 */

// Signal Processing Metrics
export const signalProcessingLatency = new Histogram({
  name: 'signal_processing_latency_seconds',
  help: 'Time taken to process a trading signal',
  labelNames: ['status'], // 'success' or 'failed'
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5], // 10ms to 5s
  registers: [register],
});

export const signalProcessingCount = new Counter({
  name: 'signal_processing_total',
  help: 'Total number of signals processed',
  labelNames: ['status'], // 'success', 'failed', 'skipped'
  registers: [register],
});

// Trade Execution Metrics
export const tradeExecutionLatency = new Histogram({
  name: 'trade_execution_latency_seconds',
  help: 'Time taken to execute a trade',
  labelNames: ['type', 'status'], // type: 'purchase' | 'sale', status: 'success' | 'failed'
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30], // 100ms to 30s
  registers: [register],
});

export const tradeExecutionCount = new Counter({
  name: 'trade_execution_total',
  help: 'Total number of trades executed',
  labelNames: ['type', 'status'], // type: 'purchase' | 'sale', status: 'success' | 'failed'
  registers: [register],
});

// Stop Loss Metrics
export const stopLossEvaluationLatency = new Histogram({
  name: 'stop_loss_evaluation_latency_seconds',
  help: 'Time taken to evaluate stop loss for a token',
  labelNames: ['agent_id', 'token_address'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1], // 1ms to 100ms
  registers: [register],
});

export const stopLossTriggerCount = new Counter({
  name: 'stop_loss_trigger_total',
  help: 'Total number of stop loss triggers',
  labelNames: ['agent_id', 'token_address'],
  registers: [register],
});

// Stale Trade Metrics
export const staleTradeTriggerCount = new Counter({
  name: 'stale_trade_trigger_total',
  help: 'Total number of stale trade auto-close triggers',
  labelNames: ['agent_id', 'token_address'],
  registers: [register],
});

// DCA (Dollar Cost Averaging) Metrics
export const dcaTriggerCount = new Counter({
  name: 'dca_trigger_total',
  help: 'Total number of DCA triggers',
  labelNames: ['agent_id', 'token_address', 'level'],
  registers: [register],
});

export const dcaExecutionLatency = new Histogram({
  name: 'dca_execution_latency_seconds',
  help: 'Time taken to execute a DCA buy',
  labelNames: ['agent_id', 'token_address'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30], // 100ms to 30s
  registers: [register],
});

// Price Update Metrics
export const priceUpdateLatency = new Histogram({
  name: 'price_update_latency_seconds',
  help: 'Time taken to fetch and process price updates',
  labelNames: ['source'], // 'dexscreener' | 'pyth'
  buckets: [0.1, 0.5, 1, 2, 5], // 100ms to 5s
  registers: [register],
});

export const priceUpdateCount = new Counter({
  name: 'price_update_total',
  help: 'Total number of price updates',
  labelNames: ['source', 'status'], // status: 'success' | 'failed' | 'partial'
  registers: [register],
});

// Redis Metrics
export const redisOperationLatency = new Histogram({
  name: 'redis_operation_latency_seconds',
  help: 'Time taken for Redis operations',
  labelNames: ['operation'], // 'get', 'set', 'del', etc.
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1], // 1ms to 100ms
  registers: [register],
});

export const redisOperationCount = new Counter({
  name: 'redis_operation_total',
  help: 'Total number of Redis operations',
  labelNames: ['operation', 'status'], // status: 'success' | 'error'
  registers: [register],
});

// Queue Metrics
export const queueDepth = new Gauge({
  name: 'queue_depth',
  help: 'Current number of jobs in queue',
  labelNames: ['queue_name'],
  registers: [register],
});

export const queueJobLatency = new Histogram({
  name: 'queue_job_latency_seconds',
  help: 'Time taken to process a queue job',
  labelNames: ['queue_name', 'job_type', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

export const queueJobCount = new Counter({
  name: 'queue_job_total',
  help: 'Total number of queue jobs processed',
  labelNames: ['queue_name', 'job_type', 'status'],
  registers: [register],
});

// API Metrics
export const apiRequestCount = new Counter({
  name: 'api_requests_total',
  help: 'Total number of API requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

export const apiRequestLatency = new Histogram({
  name: 'api_request_latency_seconds',
  help: 'API request latency',
  labelNames: ['method', 'path'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// Error Metrics
export const errorCount = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'code'], // type: 'trading', 'api', 'database', etc.
  registers: [register],
});

/**
 * Get metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Get metrics registry
 */
export function getRegistry(): Registry {
  return register;
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
  register.resetMetrics();
}

