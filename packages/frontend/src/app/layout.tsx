/**
 * Nexgent AI Trading Engine
 * Copyright (C) 2026 Nexgent AI
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * Attribution Notice:
 * If you publicly deploy, distribute, or operate a modified or unmodified
 * version of this software, you must preserve the following attribution
 * in a reasonable and prominent location within the user interface or
 * documentation:
 *
 * "Powered by Nexgent AI – https://nexgent.ai"
 */

import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/shared/providers';
import { Toaster } from '@/shared/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Nexgent AI',
  description: 'Open-source Solana AI agent trading automation framework',
  icons: {
    icon: '/favicon.svg',
  },
};

/**
 * Root layout component
 * 
 * Wraps all pages with providers and global styles.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className="font-sans">
        <AppProviders>{children}</AppProviders>
        <Toaster />
      </body>
    </html>
  );
}

