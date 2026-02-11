/**
 * FormError component
 * 
 * Displays form errors with proper accessibility attributes.
 * 
 * @example
 * ```tsx
 * <FormError error={error} ariaLabel="Login error" />
 * ```
 */

import type { FormErrorProps } from '../types/auth.types';

/**
 * Form error display component
 * 
 * Displays error messages with proper ARIA attributes for screen readers.
 * 
 * @param error - Error message to display (null/undefined hides the component)
 * @param ariaLabel - ARIA label for the error message
 */
export function FormError({ error, ariaLabel = 'Error message' }: FormErrorProps) {
  if (!error) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-label={ariaLabel}
      className="rounded-md bg-destructive/15 p-3"
      style={{
        backgroundColor: 'var(--auth-error-bg)',
      }}
    >
      <p className="text-sm text-destructive" style={{ color: 'var(--auth-error-text)' }}>
        {error}
      </p>
    </div>
  );
}

