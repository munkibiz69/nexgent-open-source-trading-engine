/**
 * Authentication API types
 * Shared between frontend and backend
 */

/**
 * Request body for user registration
 */
export interface RegisterRequest {
  email: string;
  password: string;
}

/**
 * Request body for user login
 */
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Request body for refreshing access token
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * User object returned in auth responses
 */
export interface AuthUser {
  id: string;
  email: string;
  createdAt?: Date;
}

/**
 * Authentication response containing tokens and user info
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/**
 * Response from refresh token endpoint
 */
export interface RefreshTokenResponse {
  accessToken: string;
}