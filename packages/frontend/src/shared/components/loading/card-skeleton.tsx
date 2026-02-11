/**
 * Card Skeleton Component
 * 
 * A skeleton loader for card layouts.
 * 
 * @module shared/components/loading
 */

import { Skeleton } from '@/shared/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { cn } from '@/shared/utils/cn';

export interface CardSkeletonProps {
  /**
   * Number of skeleton cards to display
   * @default 1
   */
  count?: number;
  /**
   * Whether to show header skeleton
   * @default true
   */
  showHeader?: boolean;
  /**
   * Number of content lines
   * @default 3
   */
  lines?: number;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Card skeleton component
 * 
 * Displays a skeleton loader that matches card layouts.
 * 
 * @example
 * ```tsx
 * <CardSkeleton count={3} lines={4} />
 * ```
 */
export function CardSkeleton({
  count = 1,
  showHeader = true,
  lines = 3,
  className,
}: CardSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={`card-${index}`}>
          {showHeader && (
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardHeader>
          )}
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: lines }).map((_, lineIndex) => (
                <Skeleton
                  key={`line-${lineIndex}`}
                  className={cn(
                    'h-4',
                    lineIndex === lines - 1 ? 'w-3/4' : 'w-full'
                  )}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

