/**
 * Error State Component
 * 
 * A component for displaying full-page or section error states with retry functionality.
 * 
 * @module shared/components/error
 */

import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { formatErrorMessage } from '@/shared/utils/error-handling';
import { cn } from '@/shared/utils/cn';

export interface ErrorStateProps {
  /**
   * The error to display
   */
  error: unknown;
  /**
   * Callback function to retry the failed operation
   */
  onRetry?: () => void;
  /**
   * Custom error title
   * @default 'Something went wrong'
   */
  title?: string;
  /**
   * Custom error message (overrides formatted error)
   */
  message?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether to show retry button
   * @default true
   */
  showRetry?: boolean;
}

/**
 * Error state component
 * 
 * Displays a full error state with retry functionality.
 * Use this for page-level or section-level errors.
 * 
 * @example
 * ```tsx
 * <ErrorState 
 *   error={error} 
 *   onRetry={() => refetch()} 
 *   title="Failed to load data"
 * />
 * ```
 */
export function ErrorState({
  error,
  onRetry,
  title = 'Something went wrong',
  message,
  className,
  showRetry = true,
}: ErrorStateProps) {
  const errorMessage = message || formatErrorMessage(error);

  return (
    <div className={cn('flex flex-col items-center justify-center p-8', className)}>
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="mt-2">{errorMessage}</AlertDescription>
        {showRetry && onRetry && (
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        )}
      </Alert>
    </div>
  );
}

