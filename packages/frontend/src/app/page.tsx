/**
 * Home page
 * 
 * Redirects to dashboard or login based on authentication status.
 */

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/infrastructure/auth/auth-config';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // Redirect authenticated users to performance overview, others to login
  if (session) {
    redirect('/dashboard/performance-overview');
  } else {
    redirect('/login');
  }
}

