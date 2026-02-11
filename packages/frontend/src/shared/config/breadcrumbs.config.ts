/**
 * Breadcrumb configuration
 * 
 * Maps dashboard routes to breadcrumb labels for navigation.
 * 
 * @module shared/config
 */

export interface BreadcrumbConfig {
  main: string;
  sub: string;
  extra?: string;
}

/**
 * Breadcrumb mapping for dashboard routes
 */
export const breadcrumbMap: Record<string, BreadcrumbConfig> = {
  '/dashboard': { main: 'Insights', sub: 'Overview' },
  '/dashboard/performance-overview': { main: 'Insights', sub: 'Performance overview' },
  '/dashboard/trade-signals': { main: 'Insights', sub: 'Trade signals' },
  '/dashboard/risk-profile': { main: 'Insights', sub: 'Risk profile' },
  '/dashboard/market-insights': { main: 'Insights', sub: 'Market insights' },
  '/dashboard/agent-profile': { main: 'Agent configuration', sub: 'Profile & strategy' },
  '/dashboard/signals': { main: 'Agent configuration', sub: 'Profile & strategy' },
  '/dashboard/trading': { main: 'Agent configuration', sub: 'Trading' },
  '/dashboard/integrations': { main: 'Settings', sub: 'Integrations' },
  '/dashboard/general': { main: 'Settings', sub: 'General' },
};

/**
 * Get breadcrumb configuration for a given pathname
 * 
 * @param pathname - Current route pathname
 * @returns Breadcrumb configuration
 */
export function getBreadcrumb(pathname: string): BreadcrumbConfig {
  // Handle dynamic routes (e.g., /dashboard/performance-overview/[wallet])
  if (pathname.startsWith('/dashboard/performance-overview/')) {
    const walletAddress = pathname.split('/').pop();
    return {
      main: 'Insights',
      sub: 'Performance overview',
      extra: walletAddress,
    };
  }

  // Return mapped breadcrumb or default
  return breadcrumbMap[pathname] || { main: 'Insights', sub: 'Overview' };
}

