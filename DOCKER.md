# Docker Setup for Nexgent

This guide explains how to run PostgreSQL and Redis using Docker for local development.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (usually included with Docker Desktop)

## Quick Start

### 1. Start Services

From the project root, run:

```bash
docker-compose up -d
```

This will:
- Start PostgreSQL on port 5432
- Start Redis on port 6379
- Create persistent volumes for data

### 2. Verify Services are Running

```bash
docker-compose ps
```

You should see both `nexgent-postgres` and `nexgent-redis` running.

### 3. Check Logs (if needed)

```bash
# All services
docker-compose logs

# Just PostgreSQL
docker-compose logs postgres

# Just Redis
docker-compose logs redis
```

## Database Credentials

The Docker setup uses these default credentials:

- **Username**: `postgres`
- **Password**: `postgres`
- **Database**: `nexgent`
- **Host**: `localhost`
- **Port**: `5432`

These match the default values in `packages/backend/env.example`.

## Connecting to PostgreSQL

### Using psql (if installed)

```bash
psql -h localhost -U postgres -d nexgent
# Password: postgres
```

### Using Docker exec

```bash
docker exec -it nexgent-postgres psql -U postgres -d nexgent
```

### Using Prisma Studio

```bash
cd packages/backend
pnpm db:studio
```

This opens Prisma Studio at `http://localhost:5555` - a visual database browser where you can view, add, edit, and delete records.

## Running Database Migrations

Once the database is running:

```bash
cd packages/backend
pnpm db:migrate
```

This will create all the necessary tables.

## Stopping Services

```bash
# Stop services (keeps data)
docker-compose stop

# Stop and remove containers (keeps data)
docker-compose down

# Stop and remove containers + volumes (deletes all data)
docker-compose down -v
```

## Log Limits

Container logs are capped so they don’t fill disk:

- **max-size**: 20 MB per log file
- **max-file**: 5 rotated files (about 100 MB total per service)

To change this, edit the `logging.options` for each service in `docker-compose.yml`.

## Data Persistence

Data is stored in Docker volumes, so it persists even if you stop the containers.

To completely reset the database:

```bash
docker-compose down -v
docker-compose up -d
cd packages/backend
pnpm db:migrate
```

## Troubleshooting

### Port Already in Use

If port 5432 or 6379 is already in use:

```bash
# Windows
netstat -ano | findstr :5432

# macOS/Linux
lsof -i :5432
```

Either stop the conflicting service or change the port in `docker-compose.yml`.

### Container Won't Start

1. Check logs: `docker-compose logs postgres`
2. Make sure Docker Desktop is running
3. Try removing and recreating: `docker-compose down -v && docker-compose up -d`

### Can't Connect to Database

1. Verify container is running: `docker-compose ps`
2. Check health status shows "healthy"
3. Verify `.env` credentials match `docker-compose.yml`

## Production

**⚠️ Important**: The default credentials are for development only!

For production:
- Use strong, unique passwords
- Don't expose ports publicly
- Use managed database services (AWS RDS, Supabase, etc.)
