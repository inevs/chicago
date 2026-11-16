# Docker Deployment Guide

This guide explains how to deploy the dividends tracking application using Docker or Podman.

## Architecture

The application consists of three containerized services:

1. **PostgreSQL Database** (`postgres`) - PostgreSQL 16 database server
2. **NestJS API** (`api`) - Backend API server on port 3000
3. **Angular Frontend** (`frontend`) - Nginx-served static frontend on port 80

All services communicate over a dedicated bridge network (`dividends-network`).

## Prerequisites

- Docker (version 20.10+) or Podman (version 4.0+)
- Docker Compose or Podman Compose

## Quick Start

### Using Docker Compose

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Stop and remove all data
docker compose down -v
```

### Using Podman Compose

```bash
# Build and start all services
podman-compose up -d

# View logs
podman-compose logs -f

# Stop all services
podman-compose down

# Stop and remove all data
podman-compose down -v
```

## Service Details

### PostgreSQL Database

- **Image**: `postgres:16-alpine`
- **Container Name**: `dividends-postgres`
- **Port**: `5432` (exposed on host)
- **Credentials**:
  - User: `dividends`
  - Password: `dividends`
  - Database: `dividends`
- **Data Persistence**: Volume `postgres-data`
- **Health Check**: Checks PostgreSQL readiness every 10 seconds

### API Service

- **Build Context**: Root directory
- **Dockerfile**: `apps/api/Dockerfile`
- **Container Name**: `dividends-api`
- **Port**: `3000` (exposed on host)
- **Environment Variables**:
  - `DATABASE_URL`: Connection string to PostgreSQL
  - `NODE_ENV`: `production`
  - `PORT`: `3000`
  - `JWT_SECRET`: Secret for signing access tokens
  - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`: Login user created by the seed
  - `ALLOW_REGISTRATION`: Enables `POST /api/auth/register` (default `false`, single-user mode)
- **Dependencies**: Waits for PostgreSQL to be healthy
- **Startup Process**:
  1. Runs Prisma migrations (`prisma migrate deploy`)
  2. Starts the NestJS server
- **Health Check**: HTTP GET to `/api/health` every 30 seconds

### Frontend Service

- **Build Context**: Root directory
- **Dockerfile**: `apps/dividends/Dockerfile`
- **Container Name**: `dividends-frontend`
- **Port**: `80` (exposed on host)
- **Nginx Configuration**: `apps/dividends/nginx.conf`
- **API Proxy**: Proxies `/api/*` requests to the backend API service
- **Dependencies**: Waits for API service to start

## Building Individual Services

You can build and run individual services:

```bash
# Build only the API
docker compose build api

# Build only the frontend
docker compose build frontend

# Run only the database and API
docker compose up -d postgres api
```

## Environment Configuration

### Production Environment Variables

For production deployments, create a `.env.production` file or modify the `docker-compose.yml` environment section:

```yaml
api:
  environment:
    DATABASE_URL: postgresql://your_user:your_password@postgres:5432/dividends
    NODE_ENV: production
    PORT: 3000
    # Add other environment variables as needed
```

### Custom Ports

To change the exposed ports, modify the `ports` section in `docker-compose.yml`:

```yaml
frontend:
  ports:
    - '8080:80'  # Access frontend on http://localhost:8080

api:
  ports:
    - '3001:3000'  # Access API on http://localhost:3001
```

## Database Management

### Accessing the Database

```bash
# Connect to PostgreSQL using psql
docker exec -it dividends-postgres psql -U dividends -d dividends

# Or using Docker Compose
docker compose exec postgres psql -U dividends -d dividends
```

### Running Migrations

Migrations run automatically when the API container starts. To run migrations manually:

```bash
docker compose exec api npx prisma migrate deploy
```

### Backup and Restore

```bash
# Backup
docker exec dividends-postgres pg_dump -U dividends dividends > backup.sql

# Restore
docker exec -i dividends-postgres psql -U dividends -d dividends < backup.sql
```

## Monitoring and Debugging

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f postgres

# Last 100 lines
docker compose logs --tail=100 api
```

### Check Service Health

```bash
# Check all containers
docker compose ps

# Check API health endpoint
curl http://localhost:3000/api/health

# Check frontend
curl http://localhost
```

### Access Container Shell

```bash
# API container
docker compose exec api sh

# Frontend container
docker compose exec frontend sh

# Database container
docker compose exec postgres sh
```

## Troubleshooting

### API Container Fails to Start

1. Check if migrations are failing:
   ```bash
   docker compose logs api
   ```

2. Verify database connection:
   ```bash
   docker compose exec api node -e "console.log(process.env.DATABASE_URL)"
   ```

3. Manually run migrations:
   ```bash
   docker compose exec api npx prisma migrate deploy
   ```

### Frontend Cannot Connect to API

1. Check if API is healthy:
   ```bash
   docker compose ps api
   curl http://localhost:3000/api/health
   ```

2. Verify nginx configuration:
   ```bash
   docker compose exec frontend cat /etc/nginx/conf.d/default.conf
   ```

3. Check nginx logs:
   ```bash
   docker compose logs frontend
   ```

### Database Connection Issues

1. Verify PostgreSQL is running:
   ```bash
   docker compose ps postgres
   ```

2. Check if database is ready:
   ```bash
   docker compose exec postgres pg_isready -U dividends
   ```

3. Test connection:
   ```bash
   docker compose exec postgres psql -U dividends -d dividends -c "SELECT 1"
   ```

## Production Deployment Checklist

Before deploying to production:

- [ ] Change default database credentials in `docker-compose.yml`
- [ ] Set up proper environment variables (use `.env` file or secrets)
- [ ] Configure proper volumes for persistent data
- [ ] Set up SSL/TLS certificates (use a reverse proxy like Traefik or Nginx)
- [ ] Configure proper logging and monitoring
- [ ] Set up automated backups for the database
- [ ] Review and update resource limits (CPU, memory)
- [ ] Implement proper secrets management
- [ ] Configure firewall rules
- [ ] Set up health monitoring and alerting

## Cleaning Up

```bash
# Stop and remove containers
docker compose down

# Remove containers, volumes, and images
docker compose down -v --rmi all

# Remove dangling images
docker image prune -f
```

## Advanced Configuration

### Resource Limits

Add resource limits to prevent containers from consuming too many resources:

```yaml
api:
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 1G
      reservations:
        cpus: '0.5'
        memory: 512M
```

### Using External Database

To use an external PostgreSQL database instead of the containerized one:

1. Remove the `postgres` service from `docker-compose.yml`
2. Update the `DATABASE_URL` environment variable in the API service
3. Remove the `depends_on` condition for PostgreSQL

```yaml
api:
  environment:
    DATABASE_URL: postgresql://user:password@external-host:5432/database
```

## Support

For issues specific to Docker deployment, check:
- Docker logs: `docker compose logs`
- Container status: `docker compose ps`
- Network connectivity: `docker network inspect dividends-network`
