#!/usr/bin/env node
/**
 * Cache Management CLI
 * 
 * Command-line tool for managing the Redis cache.
 * Use this instead of API endpoints for cache operations.
 * 
 * Usage:
 *   pnpm cache:status   - Show cache key counts and Redis health
 *   pnpm cache:warmup   - Re-warm cache from database (non-destructive)
 *   pnpm cache:reset    - Clear all cache keys and re-warm from database
 * 
 * Or run directly:
 *   node scripts/cache-manage.js status
 *   node scripts/cache-manage.js warmup
 *   node scripts/cache-manage.js reset
 */

import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Set up path aliases for the script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dynamic imports after environment is loaded
async function main() {
  const command = process.argv[2];

  if (!command || !['status', 'warmup', 'reset'].includes(command)) {
    console.log(`
Cache Management CLI

Usage:
  node scripts/cache-manage.js <command>

Commands:
  status   Show cache key counts and Redis health
  warmup   Re-warm cache from database (non-destructive)
  reset    Clear ALL cache keys and re-warm from database

Examples:
  pnpm cache:status
  pnpm cache:warmup
  pnpm cache:reset
`);
    process.exit(1);
  }

  console.log('🔄 Loading cache services...');

  // Import services dynamically (they need environment variables loaded first)
  const { cacheWarmer } = await import('../src/infrastructure/cache/cache-warmer.js');
  const { redisService } = await import('../src/infrastructure/cache/redis-client.js');
  const { redisConfig } = await import('../src/config/redis.config.js');

  try {
    const client = redisService.getClient();
    const prefix = redisConfig.keyPrefix || '';

    switch (command) {
      case 'status':
        await showStatus(client, prefix, redisService);
        break;

      case 'warmup':
        await warmupCache(cacheWarmer, client, prefix);
        break;

      case 'reset':
        await resetCache(client, prefix, cacheWarmer);
        break;
    }

    // Close Redis connection
    await redisService.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Show cache status and key counts
 */
async function showStatus(client, prefix, redisService) {
  console.log('\n📊 Cache Status\n');

  // Check Redis connection
  const isConnected = await redisService.healthCheck();
  console.log(`Redis Connected: ${isConnected ? '✅ Yes' : '❌ No'}`);
  console.log(`Key Prefix: ${prefix || '(none)'}`);
  console.log('');

  // Count keys by pattern
  const positionKeys = await client.keys(`${prefix}position:*`);
  const balanceKeys = await client.keys(`${prefix}balance:*`);
  const configKeys = await client.keys(`${prefix}config:*`);
  const priceKeys = await client.keys(`${prefix}price:*`);
  const allAgentKeys = await client.keys(`${prefix}agent:*`);
  const activeAgents = await client.smembers('active_agents');

  // Filter out position index keys
  const agentKeys = allAgentKeys.filter(key => {
    const keyWithoutPrefix = prefix ? key.slice(prefix.length) : key;
    return !keyWithoutPrefix.endsWith(':positions');
  });

  console.log('Key Counts:');
  console.log(`  Positions:     ${positionKeys.length}`);
  console.log(`  Balances:      ${balanceKeys.length}`);
  console.log(`  Configs:       ${configKeys.length}`);
  console.log(`  Prices:        ${priceKeys.length}`);
  console.log(`  Agents:        ${agentKeys.length}`);
  console.log(`  Active Agents: ${activeAgents.length}`);
  console.log('');
}

/**
 * Warm up cache from database (non-destructive)
 */
async function warmupCache(cacheWarmer, client, prefix) {
  console.log('\n🔥 Warming up cache from database...\n');

  await cacheWarmer.warmup();

  // Show counts after warmup
  const positionKeys = await client.keys(`${prefix}position:*`);
  const balanceKeys = await client.keys(`${prefix}balance:*`);
  const configKeys = await client.keys(`${prefix}config:*`);

  console.log('\n✅ Cache warmup complete\n');
  console.log('Cached:');
  console.log(`  Positions: ${positionKeys.length}`);
  console.log(`  Balances:  ${balanceKeys.length}`);
  console.log(`  Configs:   ${configKeys.length}`);
  console.log('');
}

/**
 * Clear all cache keys and re-warm from database
 */
async function resetCache(client, prefix, cacheWarmer) {
  console.log('\n⚠️  Clearing ALL cache keys...\n');

  // Get all keys with prefix
  const keys = await client.keys(`${prefix}*`);
  
  if (keys.length === 0) {
    console.log('No cache keys found to clear.');
  } else {
    // Delete in batches to avoid blocking
    const batchSize = 100;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      await client.del(...batch);
    }
    console.log(`✅ Cleared ${keys.length} cache key(s)`);
  }

  console.log('\n🔥 Re-warming cache from database...\n');
  await cacheWarmer.warmup();

  // Show counts after warmup
  const positionKeys = await client.keys(`${prefix}position:*`);
  const balanceKeys = await client.keys(`${prefix}balance:*`);
  const configKeys = await client.keys(`${prefix}config:*`);

  console.log('\n✅ Cache reset complete\n');
  console.log('Cached:');
  console.log(`  Positions: ${positionKeys.length}`);
  console.log(`  Balances:  ${balanceKeys.length}`);
  console.log(`  Configs:   ${configKeys.length}`);
  console.log('');
}

main();
