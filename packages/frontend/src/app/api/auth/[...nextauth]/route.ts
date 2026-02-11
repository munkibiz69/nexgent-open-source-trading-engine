/**
 * NextAuth.js API Route
 * 
 * Handles authentication via NextAuth.js.
 * Uses custom credentials provider to connect to our backend JWT API.
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/infrastructure/auth/auth-config';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

