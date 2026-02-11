/**
 * Auth feature types
 * 
 * Type definitions specific to the auth feature module.
 */

/**
 * Props for authentication form components
 */
export interface AuthFormProps {
  /**
   * Optional callback fired after successful authentication
   */
  onSuccess?: () => void;
}

/**
 * Form error display props
 */
export interface FormErrorProps {
  /**
   * Error message to display
   */
  error: string | null;
  /**
   * Optional ARIA label for the error message
   * 
   * @default 'Error message'
   */
  ariaLabel?: string;
}

/**
 * Return type for useLogin hook
 */
export interface UseLoginReturn {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Return type for useRegister hook
 */
export interface UseRegisterReturn {
  register: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

