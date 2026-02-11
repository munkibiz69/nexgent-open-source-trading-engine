/**
 * NextAuth.js Configuration
 * 
 * Centralized configuration for NextAuth.js authentication.
 * This file is separate from the route handler to comply with Next.js 15 requirements.
 */

import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { apiClient } from '@/infrastructure/api/client/api-client';
import { isTokenExpiring, refreshAccessToken } from './token-utils';

/**
 * Validate NEXTAUTH_SECRET
 * 
 * Warns if secret is missing or using the example value from env.example.
 * This helps open source contributors avoid security issues.
 */
function validateNextAuthSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Skip validation during build - Next.js executes this code during build
  // to collect page data, but env vars aren't available yet
  // We'll validate at runtime when the server actually starts
  if (process.env.NEXT_PHASE) {
    return; // We're in a build phase
  }

  if (!secret) {
    const message = `
⚠️  NEXTAUTH_SECRET is not set!

Generate a secret using one of these methods:
  pnpm generate-secret
  node scripts/generate-secret.js
  openssl rand -base64 32

Then add it to your .env.local file.
`;
    if (isDevelopment) {
      console.warn(message);
    } else {
      throw new Error('NEXTAUTH_SECRET is required in production');
    }
  } else if (
    secret === 'your-nextauth-secret-key-minimum-32-characters-long' ||
    secret.length < 32
  ) {
    const message = `
⚠️  NEXTAUTH_SECRET appears to be using the example value or is too short!

This is insecure and should not be used in production.
Generate a secure secret:
  pnpm generate-secret
  node scripts/generate-secret.js
`;
    console.warn(message);
  }
}

// Validate secret on module load
validateNextAuthSecret();

/**
 * NextAuth configuration
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember Me', type: 'checkbox' },
      },
      /**
       * Authorize function - called when user attempts to sign in
       * 
       * Calls our backend /api/auth/login endpoint and returns user data
       * if authentication succeeds.
       */
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Call backend login endpoint
          // NextAuth sends checkbox values as strings ('true' or 'false'), so we need to convert
          const rememberMe = credentials.rememberMe === 'true';
          const response = await apiClient.post('/api/v1/auth/login', {
            email: credentials.email,
            password: credentials.password,
            rememberMe,
          });

          if (!response.ok) {
            // Authentication failed
            return null;
          }

          const data = await response.json();

          // Return user object that will be stored in session
          return {
            id: data.user.id,
            email: data.user.email,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    /**
     * JWT callback - called whenever a JWT is created or updated
     * 
     * Stores access token and refresh token in the JWT token.
     * Automatically refreshes access token if it's expiring.
     */
    async jwt({ token, user }) {
      // Initial sign in - user object contains tokens
      if (user) {
        token.accessToken = (user as { accessToken?: string }).accessToken;
        token.refreshToken = (user as { refreshToken?: string }).refreshToken;
        token.id = user.id;
        token.email = user.email ?? undefined;
        return token;
      }

      // If tokens are already missing, don't try to refresh
      if (!token.refreshToken || !token.accessToken) {
        return token;
      }

      // Check if access token is expiring (within 5 minutes)
      if (isTokenExpiring(token.accessToken as string)) {
        try {
          // Refresh access token (refresh token stays the same)
          const accessToken = await refreshAccessToken(token.refreshToken as string);
          token.accessToken = accessToken;
        } catch (error) {
          // Refresh token is invalid or revoked - force re-authentication
          console.error('Token refresh failed:', error);
          token.accessToken = undefined;
          token.refreshToken = undefined;
        }
      }

      return token;
    },
    /**
     * Session callback - called whenever a session is checked
     * 
     * Adds user data and access token to the session object.
     * Returns a session without accessToken if tokens are missing,
     * which will be treated as invalid by components checking for accessToken.
     */
    async session({ session, token }) {
      // If tokens are missing, return session without accessToken
      // Components should check for accessToken to determine if session is valid
      if (!token.accessToken || !token.refreshToken) {
        return {
          ...session,
          user: {
            ...session.user,
            id: '',
            email: '',
          },
          accessToken: undefined,
        };
      }

      if (session.user && token.id) {
        session.user.id = token.id;
        (session as { accessToken?: string }).accessToken = token.accessToken as string;
      }

      return session;
    },
    /**
     * Redirect callback - controls where users are redirected after sign in
     * 
     * Always redirects to dashboard after successful login.
     * Prevents redirect loops by ensuring we never redirect to login.
     */
    async redirect({ url, baseUrl }) {
      // Always redirect to performance overview after login
      // This provides a consistent experience regardless of where the user came from
      const dashboardUrl = `${baseUrl}/dashboard/performance-overview`;

      // If url is trying to redirect to login or root, definitely go to performance overview
      if (url.includes('/login') || url === baseUrl || url === `${baseUrl}/`) {
        return dashboardUrl;
      }

      // For any other URL on the same origin, check if it's a valid protected route
      try {
        const urlObj = new URL(url);
        if (urlObj.origin === baseUrl) {
          const pathname = urlObj.pathname;
          // If it's login or root, go to performance overview
          if (pathname === '/login' || pathname === '/') {
            return dashboardUrl;
          }
          // For dashboard routes, allow them (though we'll default to performance overview anyway)
          // For simplicity, always go to performance overview
          return dashboardUrl;
        }
      } catch {
        // If URL parsing fails, default to performance overview
        return dashboardUrl;
      }

      // Default to performance overview
      return dashboardUrl;
    },
  },
  pages: {
    signIn: '/login',
  },
  debug: process.env.NODE_ENV === 'development',
};

