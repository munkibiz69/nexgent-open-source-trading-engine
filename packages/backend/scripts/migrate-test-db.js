#!/usr/bin/env node
/**
 * Apply Prisma migrations to the test database.
 * Uses DATABASE_TEST_URL from .env so the main DATABASE_URL is unchanged.
 *
 * This script runs automatically before `pnpm test` and `pnpm test:integration`
 * so the test DB always has the latest schema. If DATABASE_TEST_URL is not set,
 * the script exits successfully (no-op) so unit-only runs still work.
 *
 * Prerequisites (when using integration tests):
 * 1. Docker Postgres is running (docker-compose up -d).
 * 2. Test database exists. Create it once with:
 *    docker exec -it nexgent-postgres psql -U postgres -c "CREATE DATABASE nexgent_test;"
 *
 * Manual usage (from repo root or packages/backend):
 *   pnpm --filter backend db:test:migrate
 *   pnpm db:test:migrate
 */

import 'dotenv/config';
import { spawnSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(__dirname, '../src/infrastructure/database/schema.prisma');

const testUrl = process.env.DATABASE_TEST_URL;
if (!testUrl) {
  // No test DB configured — skip so unit-only runs and CI without test DB don't fail
  console.warn('[migrate-test-db] DATABASE_TEST_URL not set; skipping test DB migration.');
  process.exit(0);
}

// Point Prisma at the test database
process.env.DATABASE_URL = testUrl;

const result = spawnSync(
  'npx',
  ['prisma', 'migrate', 'deploy', '--schema', schemaPath],
  {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  }
);

process.exit(result.status ?? 1);
