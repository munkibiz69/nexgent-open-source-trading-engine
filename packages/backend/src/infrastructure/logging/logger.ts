/**
 * Structured Logger
 * 
 * Uses pino for structured, high-performance logging.
 * Provides consistent logging interface across the application.
 */

import { pino } from 'pino';
import { appConfig } from '@/config/app.config.js';

/**
 * Create pino logger instance
 */
const logger = pino({
  level: appConfig.logLevel || 'info',
  transport: appConfig.env === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined, // Use default JSON output in production
  base: {
    env: appConfig.env,
  },
});

/**
 * Logger interface
 */
export interface ILogger {
  debug: (obj: object, msg?: string, ...args: unknown[]) => void;
  info: (obj: object, msg?: string, ...args: unknown[]) => void;
  warn: (obj: object, msg?: string, ...args: unknown[]) => void;
  error: (obj: object, msg?: string, ...args: unknown[]) => void;
  child: (bindings: Record<string, unknown>) => ILogger;
}

/**
 * Create a child logger with additional context
 * 
 * @param context - Additional context to include in all logs
 * @returns Child logger instance
 */
export function createChildLogger(context: Record<string, unknown>): ILogger {
  return logger.child(context) as ILogger;
}

/**
 * Create a request logger with request ID
 * 
 * @param requestId - Unique request ID
 * @param additionalContext - Additional context
 * @returns Child logger instance
 */
export function createRequestLogger(
  requestId: string,
  additionalContext?: Record<string, unknown>
): ILogger {
  return logger.child({
    requestId,
    ...additionalContext,
  }) as ILogger;
}

/**
 * Default logger instance
 */
export { logger };
export default logger;

