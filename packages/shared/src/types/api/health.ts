/**
 * Health API types
 * Shared between frontend and backend
 */

/**
 * Service health status
 */
export type ServiceStatus = 'healthy' | 'unhealthy';

/**
 * Overall system health status
 */
export type SystemStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Database service health
 */
export interface DatabaseHealth {
  status: ServiceStatus;
  latency?: number;
}

/**
 * Redis service health
 */
export interface RedisHealth {
  status: ServiceStatus;
  latency?: number;
}

/**
 * Queue service health
 */
export interface QueueHealth {
  status: ServiceStatus;
  workerCount?: number;
}

/**
 * Health check response
 */
export interface HealthStatus {
  status: SystemStatus;
  timestamp: string;
  uptime: number;
  services: {
    database: DatabaseHealth;
    redis: RedisHealth;
    queue: QueueHealth;
  };
}

