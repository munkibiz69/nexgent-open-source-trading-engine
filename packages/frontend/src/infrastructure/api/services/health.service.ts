/**
 * Health API Service
 * 
 * Handles health check API calls.
 * 
 * @module infrastructure/api/services
 */

import { apiClient } from '../client/api-client';
import { extractErrorFromResponse } from '../client/error-handler';

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
  latency?: number;
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

export class HealthService {
  /**
   * Fetch system health status
   * 
   * @returns Promise resolving to health status
   * @throws Error if request fails
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const response = await apiClient.get('/api/v1/health');

    if (!response.ok) {
      const errorMessage = await extractErrorFromResponse(response);
      throw new Error(errorMessage || 'Failed to fetch health status');
    }

    return response.json();
  }
}

export const healthService = new HealthService();

