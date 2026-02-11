/**
 * NextAuth.js Type Definitions
 * 
 * Extends NextAuth types to include our custom session data.
 * 
 * @module shared/types
 */

import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Extended session interface
   */
  interface Session {
    user: {
      id: string;
      email: string;
    };
    accessToken?: string;
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extended JWT interface
   */
  interface JWT {
    id?: string;
    email?: string;
    accessToken?: string;
    refreshToken?: string;
  }
}

