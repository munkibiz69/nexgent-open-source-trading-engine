/**
 * Dashboard layout
 * 
 * Main layout for protected dashboard pages.
 * Provides sidebar navigation, breadcrumbs, and user context.
 */

'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppProviders } from '@/shared/contexts/providers';
import { useUser } from '@/shared/contexts/user.context';
import { UnsavedChangesProvider } from '@/features/agents/contexts/unsaved-changes.context';
import { AppSidebar, DashboardHeader } from '@/shared/components/layout';
import { SidebarInset, SidebarProvider } from '@/shared/components/ui/sidebar';
import { LoadingSpinner } from '@/shared/components';
import { getBreadcrumb } from '@/shared/config/breadcrumbs.config';

/**
 * Inner dashboard layout component
 * 
 * Handles authentication check and renders the dashboard structure.
 */
function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { user } = useUser();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  // Show nothing if not authenticated (will redirect)
  // Also check for valid accessToken to handle cases where session exists but is invalid
  const hasValidToken = session && (session as { accessToken?: string }).accessToken;
  if (status === 'unauthenticated' || !session || !user || !hasValidToken) {
    return null;
  }

  const breadcrumb = getBreadcrumb(pathname);

  return (
    <UnsavedChangesProvider>
    <SidebarProvider>
      <AppSidebar user={{ email: user.email }} />
      <SidebarInset>
        <DashboardHeader breadcrumb={breadcrumb} />
        <div className="flex flex-1 flex-col">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
    </UnsavedChangesProvider>
  );
}

/**
 * Dashboard layout wrapper
 * 
 * Provides UserContext to all dashboard pages.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProviders>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </AppProviders>
  );
}
