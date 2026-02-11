/**
 * Auth Feature Module
 * 
 * This module exports all authentication-related components, hooks, and types.
 * 
 * @module features/auth
 */

// Components
export { Login } from './components/login';
export { Register } from './components/register';
export { LoginForm } from './components/login-form';
export { RegisterForm } from './components/register-form';
export { FormError } from './components/form-error';

// Hooks
export { useLogin } from './hooks/use-login';
export { useRegister } from './hooks/use-register';

// Types
export type {
  AuthFormProps,
  FormErrorProps,
  UseLoginReturn,
  UseRegisterReturn,
} from './types/auth.types';

// Re-export form value types from components
export type { LoginFormValues } from './components/login-form';
export type { RegisterFormValues } from './components/register-form';
