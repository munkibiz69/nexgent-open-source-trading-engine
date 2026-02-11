'use client';

/**
 * RegisterForm component
 * 
 * User registration form with email and password validation.
 * Includes password strength requirements and confirmation field.
 * 
 * @example
 * ```tsx
 * <RegisterForm onSuccess={() => router.push('/dashboard/performance-overview')} />
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
import { useRegister } from '../hooks/use-register';
import { FormError } from './form-error';
import type { AuthFormProps } from '../types/auth.types';
import { theme } from '@/shared/config/theme.config';

/**
 * Register form validation schema
 * 
 * Password requirements (OWASP 2024 recommendations):
 * - Minimum 8 characters
 * - Maximum 128 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
const registerSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be less than 128 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

/**
 * Type for register form values
 */
export type RegisterFormValues = z.infer<typeof registerSchema>;

/**
 * Register form component
 * 
 * Provides user registration with:
 * - Email validation
 * - Password strength validation
 * - Password confirmation
 * - Error handling
 * - Loading states
 * - Accessibility features
 * 
 * @param props - Component props
 * @param props.onSuccess - Optional callback fired after successful registration
 * 
 * @returns Registration form JSX
 */
export function RegisterForm({ onSuccess }: AuthFormProps) {
  const { register, isLoading, error } = useRegister();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    await register(data.email, data.password);
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
        aria-label="Registration form"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel
                htmlFor="register-email"
                className="text-gray-300"
                style={{ color: 'var(--auth-text-secondary)' }}
              >
                Email address
              </FormLabel>
              <FormControl>
                <Input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  disabled={isLoading}
                  aria-invalid={!!form.formState.errors.email}
                  aria-describedby={
                    form.formState.errors.email ? 'register-email-error' : undefined
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
                id="register-email-error"
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
                htmlFor="register-password"
                className="text-gray-300"
                style={{ color: 'var(--auth-text-secondary)' }}
              >
                Password
              </FormLabel>
              <FormControl>
                <Input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Create a password"
                  disabled={isLoading}
                  aria-invalid={!!form.formState.errors.password}
                  aria-describedby={
                    form.formState.errors.password ? 'register-password-error' : undefined
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
                id="register-password-error"
                className="text-red-400"
                style={{ color: 'var(--auth-error-text)' }}
              />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel
                htmlFor="register-confirm-password"
                className="text-gray-300"
                style={{ color: 'var(--auth-text-secondary)' }}
              >
                Confirm password
              </FormLabel>
              <FormControl>
                <Input
                  id="register-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm your password"
                  disabled={isLoading}
                  aria-invalid={!!form.formState.errors.confirmPassword}
                  aria-describedby={
                    form.formState.errors.confirmPassword
                      ? 'register-confirm-password-error'
                      : undefined
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
                id="register-confirm-password-error"
                className="text-red-400"
                style={{ color: 'var(--auth-error-text)' }}
              />
            </FormItem>
          )}
        />

        <FormError error={error} ariaLabel="Registration error" />

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
          {isLoading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </Form>
  );
}

