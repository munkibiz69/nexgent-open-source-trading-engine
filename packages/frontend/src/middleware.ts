/**
 * Next.js Middleware
 * 
 * Handles route protection and authentication checks.
 * Redirects unauthenticated users to login page without callbackUrl.
 */

import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes to pass through
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // Check for authentication token
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET
  });

  // If no token, redirect to login without callbackUrl
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    // Explicitly remove any callbackUrl that might have been added
    loginUrl.searchParams.delete('callbackUrl');
    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated, allow request to proceed
  return NextResponse.next();
}

/**
 * Protected routes - routes that require authentication
 * 
 * Note: Root path (/) is excluded to allow home page to handle its own redirect logic.
 * This prevents NextAuth from adding callbackUrl when visiting the root path directly.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - api/health (healthcheck endpoint for Railway)
     * - login (login page)
     * - register (register page)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * 
     * Note: Root path (/) is intentionally not protected by middleware
     * so that page.tsx can handle redirects without callbackUrl.
     */
    '/((?!api/auth|api/health|login|register|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

