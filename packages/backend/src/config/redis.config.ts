/**
 * Redis Configuration
 * 
 * Configuration for Redis connection and behavior.
 * Uses environment variables with sensible defaults.
 */

import { z } from 'zod';

// Schema for Redis configuration
const RedisConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().default(6379),
  password: z.string().optional(),
  db: z.number().default(0),
  keyPrefix: z.string().default('nexgent:'),
  maxRetries: z.number().default(5),
  retryDelayMs: z.number().default(1000),
});

export type RedisConfig = z.infer<typeof RedisConfigSchema>;

// Parse environment variables
// Railway uses REDISHOST (no underscore), but we support both for compatibility
const redisHost = process.env.REDIS_HOST || process.env.REDISHOST;
const redisPort = process.env.REDIS_PORT || process.env.REDISPORT;
const redisPassword = process.env.REDIS_PASSWORD || process.env.REDISPASSWORD;

export const redisConfig: RedisConfig = RedisConfigSchema.parse({
  host: redisHost,
  port: redisPort ? parseInt(redisPort, 10) : undefined,
  password: redisPassword,
  db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : undefined,
  keyPrefix: process.env.REDIS_KEY_PREFIX,
});
