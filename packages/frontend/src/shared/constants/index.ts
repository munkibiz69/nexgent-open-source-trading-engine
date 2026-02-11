/**
 * Application Constants
 * 
 * Centralized constants for the application.
 * 
 * @module shared/constants
 */

/**
 * Application-wide constants
 */
export const APP_NAME = 'Nexgent AI';
export const APP_DESCRIPTION = 'Open-source Solana AI agent trading automation framework';
export const APP_VERSION = '0.1.0';

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    REFRESH: '/api/v1/auth/refresh',
    LOGOUT: '/api/v1/auth/logout',
  },
  AGENTS: {
    LIST: '/api/v1/agents',
    CREATE: '/api/v1/agents',
    GET: (id: string) => `/api/v1/agents/${id}`,
    UPDATE: (id: string) => `/api/v1/agents/${id}`,
    DELETE: (id: string) => `/api/v1/agents/${id}`,
  },
} as const;

/**
 * Custom events for inter-component communication
 */
export const AGENT_UPDATED_EVENT = 'agent-updated';

/**
 * Emit an event to notify components that an agent was updated
 * This triggers React Query to refetch agent data
 */
export function emitAgentUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AGENT_UPDATED_EVENT));
  }
}

