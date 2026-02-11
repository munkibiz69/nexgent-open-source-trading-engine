'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/components/ui/breadcrumb';
import { Separator } from '@/shared/components/ui/separator';
import { SidebarTrigger } from '@/shared/components/ui/sidebar';
import { CurrencyToggle, TradingModeToggle } from '@/shared/components';
import { useUnsavedChanges } from '@/features/agents/contexts/unsaved-changes.context';
import type { BreadcrumbConfig } from '@/shared/config/breadcrumbs.config';

interface DashboardHeaderProps {
  breadcrumb: BreadcrumbConfig;
}

/**
 * Dashboard header with breadcrumbs.
 * Intercepts breadcrumb link clicks when on agent-profile with unsaved changes.
 */
export function DashboardHeader({ breadcrumb }: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const unsavedContext = useUnsavedChanges();

  const isAgentProfileWithUnsaved = Boolean(
    pathname?.startsWith('/dashboard/agent-profile') && unsavedContext?.hasUnsavedChanges
  );

  const handleBreadcrumbClick = React.useCallback(
    (e: React.MouseEvent, href: string) => {
      if (!href.startsWith('/') || href === pathname) return;
      if (isAgentProfileWithUnsaved) {
        e.preventDefault();
        unsavedContext?.promptBeforeNavigate(() => router.push(href));
      }
    },
    [pathname, isAgentProfileWithUnsaved, unsavedContext, router]
  );

  const performanceOverview = '/dashboard/performance-overview';

  return (
    <header className="flex flex-col md:flex-row shrink-0 py-2 md:py-0 md:h-16 md:items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:md:h-12">
      <div className="flex items-center gap-2 px-4 flex-1">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink
                href={performanceOverview}
                onClick={(e) => handleBreadcrumbClick(e, performanceOverview)}
              >
                {breadcrumb.main}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              {breadcrumb.extra ? (
                <BreadcrumbLink
                  href={performanceOverview}
                  onClick={(e) => handleBreadcrumbClick(e, performanceOverview)}
                >
                  {breadcrumb.sub}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{breadcrumb.sub}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {breadcrumb.extra && (
              <>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-mono">{breadcrumb.extra}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex items-center gap-2 px-4 md:px-0 md:pr-4 w-full md:w-auto">
        <div className="flex-1 md:flex-none">
          <TradingModeToggle />
        </div>
        <div className="flex-1 md:flex-none">
          <CurrencyToggle />
        </div>
      </div>
    </header>
  );
}
