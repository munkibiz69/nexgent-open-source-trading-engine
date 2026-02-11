import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Determine the database URL to use
// In test environment, prefer DATABASE_TEST_URL if available
const getDatabaseUrl = (): string | undefined => {
  if (process.env.NODE_ENV === 'test' && process.env.DATABASE_TEST_URL) {
    return process.env.DATABASE_TEST_URL;
  }
  return process.env.DATABASE_URL;
};

const databaseUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Only log errors by default. Set DEBUG_PRISMA=true for query logging
    log: process.env.DEBUG_PRISMA === 'true' ? ['query', 'error', 'warn'] : ['error'],
    // Use the appropriate database URL
    ...(databaseUrl && {
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    }),
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

