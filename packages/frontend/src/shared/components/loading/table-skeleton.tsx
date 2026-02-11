/**
 * Table Skeleton Component
 * 
 * A skeleton loader for table layouts with configurable rows and columns.
 * 
 * @module shared/components/loading
 */

import { Skeleton } from '@/shared/components/ui/skeleton';
import { cn } from '@/shared/utils/cn';

export interface TableSkeletonProps {
  /**
   * Number of rows to display
   * @default 5
   */
  rows?: number;
  /**
   * Number of columns to display
   * @default 4
   */
  columns?: number;
  /**
   * Whether to show header row
   * @default true
   */
  showHeader?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Table skeleton component
 * 
 * Displays a skeleton loader that matches table layouts.
 * 
 * @example
 * ```tsx
 * <TableSkeleton rows={10} columns={5} />
 * ```
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn('w-full', className)}>
      {showHeader && (
        <div className="flex gap-4 border-b pb-2 mb-2">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={`header-${i}`} className="h-4 flex-1" />
          ))}
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                className="h-4 flex-1"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

