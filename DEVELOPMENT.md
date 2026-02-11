# Setting up a Development Environment

This document details how to set up a local development environment that will allow you to contribute changes to the Nexgent AI project!

## Base Requirements

- The project is hosted on GitHub, so you need an account there (and if you are reading this, you likely do!)
- An IDE such as Microsoft VS Code IDE https://code.visualstudio.com/

## Set up Git Repository Fork

You will push changes to a fork of the Nexgent AI repository, and from there create a Pull Request into the project repository.

Fork the [Nexgent AI GitHub repository](https://github.com/Nexgent-ai/nexgent-open-source-trading-engine/fork), and follow the instructions to create a new fork.

On your new fork, click the "<> Code" button to get a URL to [clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) using your preferred method, and clone the repository; for example using `https`:

```bash
git clone https://github.com/<your username>/nexgent.git
```

Finally, add the Project repository as `upstream`:

```bash
cd nexgent
git remote add upstream https://github.com/Nexgent-ai/nexgent-open-source-trading-engine.git
git remote set-url --push upstream no_push
```

> [!TIP]
> **Windows Users**: You may find that files "change", specifically the file mode e.g. "changed file mode 100755 → 100644". You can workaround this problem with `git config core.filemode false`.

## Set up Environment

### Prerequisites

Install the following tools on your system:

- **Operating System**: macOS, Linux, or Windows (with WSL recommended for Windows)
- **`git`**: The project uses the ubiquitous `git` tool for change control. Install from https://git-scm.com/downloads
- **`Node.js`**: Version 18.0.0 or higher. Install from https://nodejs.org/en/download/package-manager
- **`pnpm`**: Version 8.0.0 or higher. Install from https://pnpm.io/installation
- **`Docker Desktop`**: Required for running PostgreSQL and Redis locally. Install from https://www.docker.com/products/docker-desktop
  - Docker Compose is included with Docker Desktop

### Initial Environment Setup

1. **Install dependencies** from the project root:

```bash
pnpm install
```

This installs dependencies for all packages in the monorepo (backend, frontend, and shared).

2. **Set up environment variables**:

```bash
# Backend environment
cd packages/backend
cp env.example .env
# Edit .env with your configuration (see below)

# Frontend environment
cd ../frontend
cp env.example .env.local
# Edit .env.local with your configuration (see below)
```

3. **Generate secrets**:

```bash
# From project root
# Frontend (NextAuth.js)
pnpm generate-secret

# Backend (JWT)
pnpm generate-secret:backend
```

These commands will generate secure random secrets and display them. Copy them into your respective `.env` files.

4. **Start Docker services** (PostgreSQL and Redis):

```bash
# From project root
docker-compose up -d
```

This starts PostgreSQL on port `5432` and Redis on port `6379` with persistent volumes.

5. **Run database migrations**:

```bash
# From project root
pnpm --filter backend db:migrate
```

This creates all necessary database tables.

### Environment Variable Configuration

#### Backend (`packages/backend/.env`)

The minimum required configuration:

```env
# Database (matches Docker Compose defaults)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nexgent?schema=public"

# Redis (matches Docker Compose defaults)
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=4000
NODE_ENV=development

# CORS (allow frontend)
CORS_ORIGIN=http://localhost:3000

# JWT Secret (use generated secret from pnpm generate-secret:backend)
JWT_SECRET="your-generated-secret-here"
```

See `packages/backend/env.example` for all available options, including:
- Test database configuration
- External API keys (Jupiter, Pyth Network, DexScreener)
- Wallet configuration for live trading

#### Frontend (`packages/frontend/.env.local`)

The minimum required configuration:

```env
# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET="your-generated-secret-here"

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:4000
```

See `packages/frontend/env.example` for all available options.

### Initial Environment Validation

To verify your setup is correct:

1. **Check Docker services are running**:

```bash
docker-compose ps
```

You should see both `nexgent-postgres` and `nexgent-redis` with status "Up".

2. **Verify database connection**:

```bash
cd packages/backend
pnpm db:studio
```

This opens Prisma Studio at `http://localhost:5555` where you can browse your database. If it opens successfully, your database connection is working.

3. **Test backend health** (after starting backend):

```bash
curl http://localhost:4000/api/v1/health
```

Should return: `{"status":"ok"}`

## Run Nexgent AI in Development Mode

With the above validation, you can now run the backend (Express) and frontend (Next.js) services in development mode with hot-reload enabled. In this mode, changes to code will automatically restart the respective service.

> [!NOTE]
> You will likely have multiple terminal sessions active in the normal development workflow. These will be annotated as _Backend Terminal_, _Frontend Terminal_, and _Docker Terminal_.

### Start the Backend Service

The backend service runs as an Express.js API server on Node.js, and is responsible for servicing API requests, WebSocket connections, and trading operations. In the _Backend Terminal_, start the backend service:

```bash
# From project root
pnpm dev:backend
```

Or from the backend directory:

```bash
cd packages/backend
pnpm dev
```

You will get output similar to:

```
[tsx] watching path: /path/to/nexgent/packages/backend/src
[tsx] watching extensions: ts,tsx,js,jsx,json
Server running on http://localhost:4000
```

At which point you can check http://localhost:4000/api/v1/health in a browser; when the backend service is ready it will return a document like:

```json
{ "status": "ok" }
```

### Start the Frontend Service

The frontend (User Interface) is a Next.js application. In development mode, it runs on port `3000` with hot module replacement. In the _Frontend Terminal_, start the frontend service:

```bash
# From project root
pnpm dev:frontend
```

Or from the frontend directory:

```bash
cd packages/frontend
pnpm dev
```

You will get output similar to:

```
  ▲ Next.js 15.5.9
  - Local:        http://localhost:3000
  - Ready in 1.2s
```

At this point, you can navigate to http://localhost:3000/ in a browser and access the Nexgent AI User Interface.

### Start Both Services Together

Alternatively, you can start both services from a single terminal:

```bash
# From project root
pnpm dev
```

This uses `concurrently` to run both services with color-coded output.

### Development Mode Features

- **Hot Reload**: Both services automatically restart when you save changes
- **TypeScript**: Type checking happens in real-time
- **Error Overlay**: Frontend shows helpful error messages in the browser
- **Source Maps**: Full debugging support with original source code

## Building and Testing Changes

When you are ready to commit, and before you commit, you should consider the following:

### Code Quality Checks

```bash
# Lint all packages
pnpm lint

# Type check all packages
pnpm type-check

# Format code (if Prettier is configured)
# pnpm format
```

### Running Tests

```bash
# Run all tests (backend only)
pnpm test

# Run backend tests only
pnpm test:backend

# Run tests in watch mode
pnpm test --watch

# Run tests with coverage
pnpm test --coverage
```

### Building for Production

```bash
# Build all packages
pnpm build

# Build backend only
pnpm build:backend

# Build frontend only
pnpm build:frontend

# Build without running tests (faster)
pnpm build:skip-tests
```

> [!NOTE]
> The build process runs tests by default. Use `build:skip-tests` only when you're certain tests pass.

### Final Validation

As a final validation before committing, stop the development servers and run a clean build:

```bash
# Stop development servers (Ctrl+C)

# Clean build
pnpm build

# Start production servers
pnpm start
```

The UI should be available at http://localhost:3000 (frontend) and http://localhost:4000 (backend). Open a browser tab and do a final check of your changes.

## Project Structure

Nexgent AI is organized as a **monorepo** using pnpm workspaces:

```
nexgent/
├── packages/
│   ├── backend/          # Express API + WebSocket server
│   │   ├── src/
│   │   │   ├── api/      # HTTP endpoints
│   │   │   ├── domain/   # Business logic
│   │   │   ├── infrastructure/  # External integrations
│   │   │   └── middleware/      # Express middleware
│   │   ├── tests/        # Test suite
│   │   └── package.json
│   ├── frontend/         # Next.js dashboard
│   │   ├── src/
│   │   │   ├── app/      # Next.js App Router
│   │   │   ├── features/ # Feature modules
│   │   │   ├── infrastructure/  # API client, WebSocket
│   │   │   └── shared/   # Shared components
│   │   └── package.json
│   └── shared/           # Shared TypeScript types
│       ├── src/
│       │   ├── types/    # Type definitions
│       │   ├── validators/  # Zod schemas
│       │   └── utils/    # Utility functions
│       └── package.json
├── docker-compose.yml    # Local PostgreSQL & Redis
└── package.json          # Root workspace config
```

### Key Directories

- **`packages/backend/src/api/`**: HTTP API endpoints organized by resource
- **`packages/backend/src/domain/`**: Business logic and domain services
- **`packages/backend/src/infrastructure/`**: Database, cache, external APIs
- **`packages/frontend/src/features/`**: Feature modules (agents, positions, etc.)
- **`packages/frontend/src/infrastructure/`**: API client, WebSocket, auth
- **`packages/shared/src/types/`**: Shared TypeScript types used by both frontend and backend

## Adding or Modifying Features

### Adding a New API Endpoint

1. **Create handler** (`packages/backend/src/api/v1/[resource]/handlers/[action].ts`):

```typescript
import { Request, Response } from 'express';
import { authenticate } from '@/middleware/auth.js';

export async function createResourceHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  // 1. Validate request (use Zod schemas from @nexgent/shared)
  // 2. Call domain service
  // 3. Return response
}
```

2. **Create routes** (`packages/backend/src/api/v1/[resource]/routes.ts`):

```typescript
import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { createResourceHandler } from './handlers/create.js';

const router = Router();
router.post('/', authenticate, createResourceHandler);
export default router;
```

3. **Register route** in `packages/backend/src/api/v1/index.ts`

See `packages/backend/README.md` for detailed architecture documentation.

### Adding a New Frontend Feature

1. **Create feature module** (`packages/frontend/src/features/[feature-name]/`):

```
features/[feature-name]/
├── components/     # Feature-specific UI components
├── hooks/          # React Query hooks
├── types/          # TypeScript types
└── index.ts        # Barrel exports
```

2. **Create API service** (`packages/frontend/src/infrastructure/api/services/[feature].ts`):

```typescript
import { apiClient } from '../client/api-client.js';

export const featureService = {
  async list(): Promise<Feature[]> {
    const response = await apiClient.get('/api/v1/features');
    return response.data;
  },
};
```

3. **Create React Query hook** (`packages/frontend/src/features/[feature-name]/hooks/use-features.ts`):

```typescript
import { useQuery } from '@tanstack/react-query';
import { featureService } from '@/infrastructure/api/services/feature.js';

export function useFeatures() {
  return useQuery({
    queryKey: ['features'],
    queryFn: () => featureService.list(),
  });
}
```

See `packages/frontend/README.md` and `packages/frontend/docs/` for detailed architecture documentation.

### Modifying Database Schema

1. **Edit Prisma schema** (`packages/backend/src/infrastructure/database/schema.prisma`):

```prisma
model MyModel {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  // ... fields
}
```

2. **Create migration**:

```bash
cd packages/backend
pnpm db:migrate
```

This creates a new migration file and applies it to your database.

3. **Generate Prisma Client**:

```bash
pnpm db:generate
```

This updates the TypeScript types for your Prisma models.

> [!IMPORTANT]
> Always create migrations for schema changes. Never use `db:push` in production.

## Database Management

### Prisma Studio

Visual database browser:

```bash
cd packages/backend
pnpm db:studio
```

Opens at http://localhost:5555. Useful for:
- Viewing and editing data
- Debugging database issues
- Testing relationships

### Running Migrations

```bash
# Create and apply new migration
pnpm db:migrate

# Apply pending migrations (production)
pnpm db:migrate:deploy

# Reset database (development only - deletes all data!)
pnpm db:push --force-reset
```

### Database Reset

To completely reset your development database:

```bash
# Stop services
docker-compose down -v

# Restart services
docker-compose up -d

# Run migrations
pnpm --filter backend db:migrate
```

## Troubleshooting

### Port Already in Use

If port 3000, 4000, 5432, or 6379 is already in use:

**Windows:**
```bash
netstat -ano | findstr :4000
# Note the PID, then:
taskkill /PID <pid> /F
```

**macOS/Linux:**
```bash
lsof -i :4000
# Note the PID, then:
kill -9 <pid>
```

Or change the port in your `.env` files and `docker-compose.yml`.

### Frontend Build Issues

If you encounter frontend build problems:

```bash
cd packages/frontend

# Clean Next.js cache
rm -rf .next

# Clean node_modules
rm -rf node_modules
pnpm install

# Rebuild
pnpm build
```

### Backend Won't Start

1. **Check Docker services**:
```bash
docker-compose ps
```

2. **Check database connection**:
```bash
cd packages/backend
pnpm db:studio
```

3. **Check Redis connection**:
```bash
docker-compose logs redis
```

4. **Verify environment variables**:
```bash
# Backend
cat packages/backend/.env

# Frontend
cat packages/frontend/.env.local
```

### Type Errors

If you see TypeScript errors:

```bash
# Regenerate Prisma Client
cd packages/backend
pnpm db:generate

# Type check all packages
pnpm type-check
```

### WebSocket Connection Issues

1. Ensure backend is running on the correct port
2. Check `NEXT_PUBLIC_API_URL` in frontend `.env.local`
3. Verify CORS settings in backend `.env` allow the frontend origin
4. Check browser console for WebSocket errors

### Test Failures

1. **Integration tests require a test database**:
   - Set `DATABASE_TEST_URL` in `packages/backend/.env`
   - Tests will delete all data from the test database

2. **Redis must be running** for cache-related tests

3. **Run tests sequentially** if you see race conditions:
```bash
cd packages/backend
pnpm test --runInBand
```

## Committing, Pushing, and Pull Requests

Once you are happy your changes are complete:

1. **Stage your changes**:
```bash
git add .
```

2. **Commit with a descriptive message**:
```bash
git commit -m "feat: add new feature description"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks

3. **Push to your fork**:
```bash
git push origin <your-branch-name>
```

4. **Create a Pull Request** on GitHub from your fork to the main repository.

### Before Submitting a PR

- [ ] All tests pass (`pnpm test`)
- [ ] Code is linted (`pnpm lint`)
- [ ] Type checking passes (`pnpm type-check`)
- [ ] Documentation is updated (if needed)
- [ ] Changes are tested manually
- [ ] Commit messages follow conventional commits

## Some Quirks!

You may observe some quirky things:

### Files That Change Automatically

- **`pnpm-lock.yaml`**: Can be modified when dependencies are updated. You can commit these changes if they're part of your PR, or exclude them if they're unrelated.
- **`packages/backend/src/infrastructure/database/schema.prisma`**: May have formatting changes after migrations. These are safe to commit.

### Development vs Production

- In development, the frontend runs on port 3000 and connects to backend on port 4000
- In production, the frontend is built as static files and can be served by the backend or a CDN
- WebSocket connections use the same origin in production but different ports in development

### Hot Reload Behavior

- Backend: Uses `tsx watch` - restarts on any `.ts` file change
- Frontend: Uses Next.js Fast Refresh - updates components without full page reload
- Sometimes a manual refresh is needed for major changes

### Database Migrations

- Migrations are stored in `packages/backend/src/infrastructure/database/migrations/`
- Never edit existing migration files - create new ones instead
- Test migrations on a copy of production data if possible

## Additional Resources

- **[Backend README](./packages/backend/README.md)** - Detailed backend architecture
- **[Frontend README](./packages/frontend/README.md)** - Frontend architecture and patterns
- **[Docker Setup](./docker/README.md)** - Docker Compose guide
- **[Deployment Guide](./docs/deployment/QUICKSTART.md)** - Production deployment
- **[Security Policy](./SECURITY.md)** - Security guidelines

## Getting Help

- **GitHub Issues**: [Report bugs or ask questions](https://github.com/Nexgent-ai/nexgent-open-source-trading-engine/issues)
- **Documentation**: Check the `docs/` directory for detailed guides
- **Code Examples**: Review existing code in `packages/backend/src/api/` and `packages/frontend/src/features/`

---

Happy coding! 🚀

