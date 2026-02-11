/**
 * Dashboard page
 * 
 * Protected route - requires authentication.
 */

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/infrastructure/auth/auth-config';

/**
 * Dashboard page component
 * 
 * Redirects to performance overview page.
 * Redirects unauthenticated users to login.
 */
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // Redirect unauthenticated users to login
  // Check for valid accessToken to ensure session is actually valid
  const hasValidToken = session && (session as { accessToken?: string }).accessToken;
  if (!hasValidToken) {
    redirect('/login');
  }

  // Redirect to performance overview
  redirect('/dashboard/performance-overview');
}

