/**
 * Page Skeleton Component
 * 
 * A full page skeleton loader that matches common page layouts.
 * 
 * @module shared/components/loading
 */

import { Skeleton } from '@/shared/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { cn } from '@/shared/utils/cn';

export interface PageSkeletonProps {
  /**
   * Whether to show header section
   * @default true
   */
  showHeader?: boolean;
  /**
   * Whether to show content cards
   * @default true
   */
  showCards?: boolean;
  /**
   * Number of content cards
   * @default 2
   */
  cardCount?: number;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Page skeleton component
 * 
 * Displays a full page skeleton loader that matches common dashboard layouts.
 * 
 * @example
 * ```tsx
 * <PageSkeleton showHeader showCards cardCount={3} />
 * ```
 */
export function PageSkeleton({
  showHeader = true,
  showCards = true,
  cardCount = 2,
  className,
}: PageSkeletonProps) {
  return (
    <div className={cn('flex flex-col gap-4 px-4 py-6', className)}>
      {showHeader && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
      )}
      {showCards && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: cardCount }).map((_, index) => (
            <Card key={`card-${index}`}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

