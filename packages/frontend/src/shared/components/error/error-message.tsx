/**
 * Error Message Component
 * 
 * A component for displaying inline error messages.
 * 
 * @module shared/components/error
 */

import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { formatErrorMessage } from '@/shared/utils/error-handling';
import { cn } from '@/shared/utils/cn';

export interface ErrorMessageProps {
  /**
   * The error to display
   */
  error: unknown;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether to show the error icon
   * @default true
   */
  showIcon?: boolean;
  /**
   * Custom error message (overrides formatted error)
   */
  message?: string;
}

/**
 * Error message component
 * 
 * Displays an inline error message in a user-friendly format.
 * 
 * @example
 * ```tsx
 * <ErrorMessage error={error} />
 * ```
 */
export function ErrorMessage({
  error,
  className,
  showIcon = true,
  message,
}: ErrorMessageProps) {
  if (!error && !message) return null;

  const errorMessage = message || formatErrorMessage(error);

  return (
    <Alert variant="destructive" className={cn('mt-2', className)}>
      {showIcon && <AlertCircle className="h-4 w-4" />}
      <AlertDescription>{errorMessage}</AlertDescription>
    </Alert>
  );
}

