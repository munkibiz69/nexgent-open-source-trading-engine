/**
 * Test Database Utilities
 * 
 * Provides utilities for setting up and cleaning up test database connections.
 * Uses a separate test database to avoid affecting development data.
 */

import { PrismaClient } from '@prisma/client';

let testPrisma: PrismaClient | null = null;

/**
 * Get or create a test Prisma client
 * 
 * Uses a separate database URL for tests (DATABASE_TEST_URL) if available,
 * otherwise falls back to the regular DATABASE_URL.
 * 
 * SAFETY: If DATABASE_TEST_URL is not set, we check if the database name
 * contains 'test' to prevent accidentally wiping production databases.
 * 
 * @returns PrismaClient instance for testing
 */
export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    const testDatabaseUrl = process.env.DATABASE_TEST_URL || process.env.DATABASE_URL;
    
    if (!testDatabaseUrl) {
      throw new Error(
        'DATABASE_TEST_URL or DATABASE_URL environment variable is required for integration tests'
      );
    }

    // SAFETY CHECK: Require DATABASE_TEST_URL or database name must contain 'test'
    // This prevents accidentally wiping production/development databases
    if (!process.env.DATABASE_TEST_URL) {
      const dbName = testDatabaseUrl.match(/\/\/(?:[^:]+:[^@]+@)?[^\/]+\/([^?]+)/)?.[1];
      if (dbName && !dbName.toLowerCase().includes('test')) {
        console.error('⚠️  CRITICAL ERROR: Tests are attempting to use the main DATABASE_URL!');
        console.error(`   Database: ${dbName}`);
        console.error('   This will DELETE ALL DATA in this database!');
        console.error('');
        console.error('   SOLUTION: Set DATABASE_TEST_URL in your .env file:');
        console.error('   DATABASE_TEST_URL="postgresql://user:pass@localhost:5432/nexgent_test"');
        console.error('');
        console.error('   Or rename your database to include "test" in the name.');
        console.error('');
        
        // ALWAYS throw - never allow tests to run against non-test databases
        // Even in CI, they should use a separate test database
        throw new Error(
          `SAFETY: Cannot run tests against database "${dbName}" - it does not contain 'test' in the name. ` +
          'Set DATABASE_TEST_URL to a separate test database to proceed. ' +
          'This prevents accidental data loss.'
        );
      }
    }

    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl,
        },
      },
      log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  return testPrisma;
}

/**
 * Clean up all test data from the database
 * 
 * Deletes all records in the correct order to respect foreign key constraints.
 * Uses transactions to ensure atomic cleanup.
 * 
 * @param prisma - Prisma client instance
 */
export async function cleanupTestDatabase(prisma: PrismaClient): Promise<void> {
  // Use a transaction to ensure atomic cleanup and prevent race conditions
  await prisma.$transaction(async (tx) => {
    // Delete in order to respect foreign key constraints
    await tx.signalExecution.deleteMany();
    await tx.agentHistoricalSwap.deleteMany();
    await tx.agentTransaction.deleteMany();
    await tx.agentPosition.deleteMany();
    await tx.agentBalance.deleteMany();
    await tx.agentWallet.deleteMany();
    await tx.agent.deleteMany();
    await tx.tradingSignal.deleteMany();
    await tx.user.deleteMany();
  }, {
    timeout: 10000, // 10 second timeout for cleanup
  });
}

/**
 * Disconnect from test database
 */
export async function disconnectTestDatabase(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
  }
}

