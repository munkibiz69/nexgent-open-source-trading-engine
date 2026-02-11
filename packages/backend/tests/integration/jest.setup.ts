/**
 * Jest Setup for Integration Tests
 *
 * This file runs BEFORE any test files are loaded.
 * It ensures that the global prisma client uses the test database.
 * It also registers a global afterAll to close queue/Redis so the process can exit without forceExit.
 */

// Override DATABASE_URL with DATABASE_TEST_URL for integration tests
// This ensures that all imports of prisma from client.ts use the test database
if (process.env.DATABASE_TEST_URL) {
  console.log('[Jest Setup] Using test database:', process.env.DATABASE_TEST_URL.replace(/:[^:@]+@/, ':***@'));
  process.env.DATABASE_URL = process.env.DATABASE_TEST_URL;
}

// Also set Redis to use test database (db 1)
process.env.REDIS_DB = '1';

// Close singletons after each test file so the process can exit cleanly (avoids forceExit)
const TEARDOWN_TIMEOUT_MS = 10000;
afterAll(async () => {
  try {
    const { QueueWorker } = await import('@/infrastructure/queue/queue-worker.js');
    const worker = QueueWorker.getInstance();
    await worker.closeAll();
  } catch {
    // Queue worker may not be imported
  }
  try {
    const { queueClient } = await import('@/infrastructure/queue/queue-client.js');
    await queueClient.closeAll();
  } catch {
    // Queue client may not be imported in this run
  }
  try {
    const { redisService } = await import('@/infrastructure/cache/redis-client.js');
    await redisService.disconnect();
  } catch {
    // Redis may not be connected
  }
}, TEARDOWN_TIMEOUT_MS);
