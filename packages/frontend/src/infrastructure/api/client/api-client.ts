/**
 * Base API Client
 *
 * Centralized API client with automatic authentication and a small,
 * fetch-based wrapper.
 *
 * @module infrastructure/api/client
 */

import { getSession, signOut } from 'next-auth/react';

/**
 * API base URL
 */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * HTTP client responsible for talking to the backend API.
 */
export class ApiClient {
  private readonly baseURL: string;

  constructor(baseURL: string) {
    // Remove trailing slash to prevent double slashes when endpoints start with /
    this.baseURL = baseURL.replace(/\/+$/, '');
  }

  /**
   * Make an HTTP request with automatic authentication.
   *
   * @param endpoint - API endpoint (e.g. `/api/agents`)
   * @param options  - Fetch options (method, body, headers, etc.)
   */
  async request(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> {
    // Get session for authentication token
    const session = await getSession();
    const token = (session as { accessToken?: string } | null)?.accessToken;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized (token expired or invalid)
    if (response.status === 401) {
      // Token refresh failed or refresh token expired
      // Sign out without callbackUrl to prevent redirect loops
      // The middleware and login page will handle the redirect properly
      await signOut({
        redirect: true,
        callbackUrl: '/login',
      });
      throw new Error('Session expired. Please log in again.');
    }

    return response;
  }

  async get(endpoint: string): Promise<Response> {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint: string, data?: unknown): Promise<Response> {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put(endpoint: string, data?: unknown): Promise<Response> {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch(endpoint: string, data?: unknown): Promise<Response> {
    return this.request(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(endpoint: string): Promise<Response> {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

/**
 * Default API client instance used across the frontend.
 */
export const apiClient = new ApiClient(API_URL);

