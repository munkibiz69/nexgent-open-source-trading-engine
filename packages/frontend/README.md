# @nexgent/frontend

Next.js frontend application for Nexgent AI trading agent dashboard.

## Overview

A modern, performant dashboard for managing AI trading agents with real-time updates, comprehensive analytics, and secure wallet management.

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Components | [shadcn/ui](https://ui.shadcn.com/) |
| State | [React Query](https://tanstack.com/query) |
| Auth | [NextAuth.js](https://next-auth.js.org/) |
| Real-time | WebSocket |
| Charts | [Recharts](https://recharts.org/) |

## Architecture

The frontend follows **clean architecture** principles with clear separation of concerns:

```
src/
├── app/                    # Next.js App Router (pages, layouts, routes)
├── features/               # Feature modules (business logic by domain)
│   ├── agents/            # Agent management
│   ├── positions/         # Live position tracking
│   ├── trades/            # Historical trade data
│   ├── transactions/      # Transaction history
│   ├── wallets/           # Wallet management
│   ├── trading-signals/   # Signal monitoring
│   └── auth/              # Authentication
├── infrastructure/         # External integrations
│   ├── api/               # HTTP client & services
│   ├── websocket/         # Real-time updates
│   └── auth/              # Auth configuration
└── shared/                # Cross-cutting concerns
    ├── components/        # Shared UI components
    ├── contexts/          # React contexts
    ├── hooks/             # Shared hooks
    ├── utils/             # Utilities
    └── config/            # Configuration
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Backend API running (see `@nexgent/backend`)

### Installation

```bash
# From monorepo root
pnpm install

# Or from this directory
cd packages/frontend
pnpm install
```

### Environment Setup

1. Copy the example environment file:

```bash
cp env.example .env.local
```

2. Configure required variables:

```env
# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:4000
```

See [env.example](./env.example) for all available options.

### Development

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type checking
pnpm type-check

# Linting
pnpm lint
```

The development server runs at [http://localhost:3000](http://localhost:3000).

## Project Structure

### Feature Modules

Each feature module in `features/` contains:

| Directory | Purpose |
|-----------|---------|
| `components/` | Feature-specific UI components |
| `hooks/` | React Query hooks for data fetching |
| `types/` | TypeScript interfaces |
| `index.ts` | Public API (barrel exports) |

**Usage:**

```typescript
// Import from feature barrel
import { useAgents, AgentSwitcher, type Agent } from '@/features/agents';
```

### Shared Components

| Directory | Purpose |
|-----------|---------|
| `shared/components/ui/` | shadcn/ui primitives (Button, Card, Dialog) |
| `shared/components/layout/` | Layout components (Sidebar, Nav) |
| `shared/components/loading/` | Loading states (Skeleton, Spinner) |
| `shared/components/error/` | Error handling (ErrorBoundary, ErrorState) |

### Infrastructure

| Directory | Purpose |
|-----------|---------|
| `infrastructure/api/` | HTTP client, services, error handling |
| `infrastructure/websocket/` | WebSocket connection & hooks |
| `infrastructure/auth/` | NextAuth.js configuration |

## Key Features

### Real-time Updates

WebSocket integration for live position and price updates:

```typescript
import { useWebSocket } from '@/infrastructure/websocket/hooks/use-websocket';

function LivePositions() {
  const { positions, isConnected } = useWebSocket(agentId);
  // Positions update in real-time
}
```

### Server State Management

React Query for all API data with optimized caching:

```typescript
import { useAgents } from '@/features/agents';

function AgentList() {
  const { data, isLoading, error } = useAgents(userId);
  // Automatic caching, refetching, and error handling
}
```

### Type-Safe API Client

Centralized API client with auth and error handling:

```typescript
import { apiClient } from '@/infrastructure/api/client/api-client';

const response = await apiClient.get('/agents');
// Automatic auth token injection
// Automatic 401 handling with redirect to login
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | Run TypeScript compiler |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTAUTH_URL` | Yes | Application URL |
| `NEXTAUTH_SECRET` | Yes | NextAuth secret (32+ chars) |
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL |

## Troubleshooting

### WebSocket Connection Issues

1. Ensure backend is running and accessible
2. Check `NEXT_PUBLIC_API_URL` is correct
3. Verify auth token is valid (try logging out/in)

### Build Errors

1. Run `pnpm type-check` to see TypeScript errors
2. Clear `.next` cache: `rm -rf .next`
3. Clear node_modules: `rm -rf node_modules && pnpm install`

### Authentication Issues

1. Verify `NEXTAUTH_SECRET` matches backend configuration
2. Check session expiry in browser dev tools
3. Clear cookies and try logging in again

## Contributing

1. Add JSDoc comments to new components and hooks
2. Run `pnpm lint` and `pnpm type-check` before committing
3. See [CONTRIBUTING.md](../../CONTRIBUTING.md) for project-wide guidelines

## 📄 License

Nexgent AI Trading Engine
Copyright (C) 2026 Nexgent AI

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

Attribution Notice:
If you publicly deploy, distribute, or operate a modified or unmodified
version of this software, you must preserve the following attribution
in a reasonable and prominent location within the user interface or
documentation:

"Powered by Nexgent AI – https://nexgent.ai"

See the [LICENSE](../../LICENSE) file for the full GPL-3.0 license text.