'use client';

/**
 * LoginForm component
 * 
 * Email/password login form with validation and accessibility features.
 * 
 * @example
 * ```tsx
 * <LoginForm onSuccess={() => router.push('/dashboard/performance-overview')} />
 * ```
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { useLogin } from '../hooks/use-login';
import { FormError } from './form-error';
import type { AuthFormProps } from '../types/auth.types';
import { theme } from '@/shared/config/theme.config';

/**
 * Login form validation schema
 * 
 * Validates email format and ensures password is provided.
 */
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

/**
 * Type for login form values
 */
export type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Login form component
 * 
 * Provides email/password authentication with:
 * - Client-side validation
 * - Error handling
 * - Loading states
 * - Accessibility features
 * 
 * @param props - Component props
 * @param props.onSuccess - Optional callback fired after successful login
 * 
 * @returns Login form JSX
 */
export function LoginForm({ onSuccess }: AuthFormProps) {
  const { login, isLoading, error } = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    await login(data.email, data.password, data.rememberMe ?? false);
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
        aria-label="Login form"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel
                htmlFor="login-email"
                className="text-gray-300"
                style={{ color: 'var(--auth-text-secondary)' }}
              >
                Email address
              </FormLabel>
              <FormControl>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  disabled={isLoading}
                  aria-invalid={!!form.formState.errors.email}
                  aria-describedby={
                    form.formState.errors.email ? 'login-email-error' : undefined
                  }
                  className="bg-gray-800/50 text-white placeholder:text-gray-500"
                  style={{
                    backgroundColor: 'var(--auth-bg-input)',
                    color: 'var(--auth-text-primary)',
                    borderColor: 'var(--auth-border)',
                    borderWidth: theme.spacing.borderWidth,
                  }}
                  {...field}
                />
              </FormControl>
              <FormMessage
                id="login-email-error"
                className="text-red-400"
                style={{ color: 'var(--auth-error-text)' }}
              />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel
                htmlFor="login-password"
                className="text-gray-300"
                style={{ color: 'var(--auth-text-secondary)' }}
              >
                Password
              </FormLabel>
              <FormControl>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  disabled={isLoading}
                  aria-invalid={!!form.formState.errors.password}
                  aria-describedby={
                    form.formState.errors.password ? 'login-password-error' : undefined
                  }
                  className="bg-gray-800/50 text-white placeholder:text-gray-500"
                  style={{
                    backgroundColor: 'var(--auth-bg-input)',
                    color: 'var(--auth-text-primary)',
                    borderColor: 'var(--auth-border)',
                    borderWidth: theme.spacing.borderWidth,
                  }}
                  {...field}
                />
              </FormControl>
              <FormMessage
                id="login-password-error"
                className="text-red-400"
                style={{ color: 'var(--auth-error-text)' }}
              />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rememberMe"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
              <FormControl>
                <Checkbox
                  id="login-remember-me"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
              </FormControl>
              <FormLabel
                htmlFor="login-remember-me"
                className="text-sm font-normal cursor-pointer"
                style={{ color: 'var(--auth-text-secondary)' }}
              >
                Remember me for 30 days
              </FormLabel>
            </FormItem>
          )}
        />

        <FormError error={error} ariaLabel="Login error" />

        <Button
          type="submit"
          className="w-full text-white"
          style={{
            backgroundColor: 'var(--auth-accent)',
            height: theme.spacing.buttonHeight,
          }}
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </Form>
  );
}

