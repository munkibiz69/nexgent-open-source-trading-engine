/**
 * Loading Overlay Component
 * 
 * A full-screen or container overlay with loading spinner.
 * 
 * @module shared/components/loading
 */

import { LoadingSpinner } from './loading-spinner';
import { cn } from '@/shared/utils/cn';

export interface LoadingOverlayProps {
  /**
   * Whether the overlay is visible
   */
  isLoading: boolean;
  /**
   * Text to display with the spinner
   */
  text?: string;
  /**
   * Whether to cover the full screen or just the container
   * @default false
   */
  fullScreen?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Spinner size
   * @default 'lg'
   */
  spinnerSize?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Loading overlay component
 * 
 * Displays a loading overlay with spinner. Can be used as a full-screen
 * overlay or within a container.
 * 
 * @example
 * ```tsx
 * <LoadingOverlay isLoading={isLoading} text="Loading data..." />
 * ```
 */
export function LoadingOverlay({
  isLoading,
  text,
  fullScreen = false,
  className,
  spinnerSize = 'lg',
}: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
        fullScreen && 'fixed',
        className
      )}
    >
      <LoadingSpinner size={spinnerSize} text={text} />
    </div>
  );
}

