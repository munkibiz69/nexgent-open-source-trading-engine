'use client';

/**
 * Register component
 * 
 * Main registration page component with email/password form.
 * Includes logo, form, and sign-in link.
 * 
 * @example
 * ```tsx
 * <Register />
 * ```
 */

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { RegisterForm } from './register-form';
import { config } from '@/shared/config/app.config';
import { theme } from '@/shared/config/theme.config';

/**
 * Register component
 * 
 * Displays the registration page with:
 * - Brand logo
 * - Email/password registration form
 * - Sign in link
 * 
 * All styling uses theme variables for easy customization.
 * 
 * @returns Registration page JSX
 */
export function Register() {
  return (
    <div
      className="flex min-h-[calc(100vh-2rem)] flex-col items-center justify-center py-12"
      style={{ backgroundColor: theme.colors.background.page }}
    >
      <Card
        className="w-full max-w-md py-8 text-white"
        style={{
          backgroundColor: theme.colors.background.card,
          color: theme.colors.text.primary,
        }}
      >
        <CardHeader className="space-y-4">
          <div className="flex justify-center mb-8">
            <Link
              href={config.urls.home}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
              aria-label="Visit Nexgent homepage"
            >
              <Image
                src="/Nexgent-Transparent-logo.png"
                alt="Nexgent Logo"
                width={200}
                height={200}
                className="h-14 w-auto"
                priority
              />
            </Link>
          </div>
          <CardTitle
            className="text-center"
            style={{ color: theme.colors.text.primary }}
          >
            Create your account
          </CardTitle>
          <CardDescription
            className="text-center"
            style={{ color: theme.colors.text.secondary }}
          >
            Enter your information to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />

          <div className="mt-6">
            <div
              className="border-t mb-4"
              style={{ borderColor: theme.colors.border.default }}
            ></div>

            <p
              className="text-sm text-center"
              style={{ color: theme.colors.text.secondary }}
            >
              Already have an account?{' '}
              <Link
                href="/login"
                className="hover:underline font-medium"
                style={{ color: theme.colors.accent.primary }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

