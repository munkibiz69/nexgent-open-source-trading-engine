/**
 * Loading Spinner Component
 * 
 * A reusable loading spinner with size variants.
 * 
 * @module shared/components/loading
 */

import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

export interface LoadingSpinnerProps {
  /**
   * Size variant of the spinner
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Text to display below the spinner
   */
  text?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

/**
 * Loading spinner component
 * 
 * @example
 * ```tsx
 * <LoadingSpinner size="lg" text="Loading..." />
 * ```
 */
export function LoadingSpinner({ 
  size = 'md', 
  className,
  text 
}: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-muted-foreground', sizeClasses[size])} />
      {text && (
        <p className="text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  );
}

