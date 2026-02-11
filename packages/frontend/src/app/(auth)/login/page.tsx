/**
 * Login page
 * 
 * Public route for user authentication.
 */

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/infrastructure/auth/auth-config';
import { Login } from '@/features/auth';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

/**
 * Login page component
 * 
 * Redirects authenticated users to dashboard.
 */
export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  // Redirect authenticated users to performance overview
  // Check for valid accessToken to ensure session is actually valid
  // (session can exist but be invalid if token refresh failed)
  if (session && (session as { accessToken?: string }).accessToken) {
    redirect('/dashboard/performance-overview');
  }

  return (
    <div className="relative">
      <div className="w-full flex justify-center px-4 pt-4 md:absolute md:top-0 md:left-0 md:right-0 md:z-10">
        <Alert className="w-auto max-w-[calc(100%-2rem)] border-[#16B364] bg-[#16B364]/10 text-[#16B364]">
          <AlertDescription className="space-y-2">
            <div>
              <strong>Nexgent AI Open Source Trading Engine — Licensed under GPL-3.0.</strong>
            </div>
            <div>• You may use, modify, and redistribute this project under GPL-3.0; any derivative work must also be licensed under GPL-3.0.</div>
            <div>• Attribution appreciated: if you fork or redistribute this software, please link back to the original GitHub repository.</div>
            <div>• The "Nexgent" name and logo are trademarks of Nexgent and may not be used to imply official endorsement of derivative projects.</div>
          </AlertDescription>
        </Alert>
      </div>
      <Login />
    </div>
  );
}

