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

### 1. Configure Environment Variables

Docker Compose reads `${...}` variables from a `.env` file in the project root. Create it from the template before the first start:

```bash
cp .env.example .env
# Edit .env: set at least JWT_SECRET, ADMIN_PASSWORD, DEFAULT_CURRENCY and DEFAULT_CURRENCY_NAME
```

> **Important:** The API container runs the database seed on every start. The seed aborts if `ADMIN_PASSWORD`, `DEFAULT_CURRENCY` or `DEFAULT_CURRENCY_NAME` is missing, and the API refuses to start without `JWT_SECRET`. In both cases the `api` container does not come up.

### 2. Using Docker Compose

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

### Alternative: Using Podman Compose

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
- **Port**: `5432` (bound to `127.0.0.1` on the host, not reachable from the network)
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
- **Port**: `3000` (bound to `127.0.0.1` on the host; other machines reach the API through the frontend under `/api`)
- **Environment Variables** (values come from `.env`, see Quick Start):

  | Variable | Required | Description |
  |---|---|---|
  | `DATABASE_URL` | set in compose | Connection string to PostgreSQL |
  | `NODE_ENV` | set in compose | `production` |
  | `PORT` | set in compose | `3000` |
  | `JWT_SECRET` | yes | Secret for signing access tokens; the API does not start without it |
  | `ADMIN_PASSWORD` | yes | Password of the login user created by the seed |
  | `ADMIN_EMAIL`, `ADMIN_NAME` | no | Login user created by the seed (defaults: `admin@example.com`, `Admin User`) |
  | `DEFAULT_CURRENCY`, `DEFAULT_CURRENCY_NAME` | yes | Default currency created by the seed (e.g. `EUR`, `Euro`) |
  | `ALLOW_REGISTRATION` | no | Enables `POST /api/auth/register` (default `false`, single-user mode) |
  | `SECURITY_PRICE_HISTORY_START` | no | Start date for historical price and exchange-rate sync (default `2017-01-01`) |

- **Dependencies**: Waits for PostgreSQL to be healthy
- **Startup Process** (`CMD` in `apps/api/Dockerfile`):
  1. Runs Prisma migrations (`prisma migrate deploy`)
  2. Seeds the database (`prisma db seed`): creates the admin user and the default currency if they do not exist yet. Existing records are not changed, so changing `ADMIN_PASSWORD` later does not update the password.
  3. Starts the NestJS server
- **Health Check**: HTTP GET to `/api/health` every 30 seconds

### Frontend Service

- **Build Context**: Root directory
- **Dockerfile**: `apps/dividends/Dockerfile`
- **Container Name**: `dividends-frontend`
- **Port**: `80` (exposed on all host interfaces)
- **Nginx Configuration**: `apps/dividends/nginx.conf`
- **API Proxy**: Proxies `/api/*` requests to the backend API service
- **Dependencies**: Waits for API service to start

## Access from Other Machines

Only the frontend (port 80) listens on all network interfaces. PostgreSQL and the API are bound to `127.0.0.1` and can only be reached from the Docker host itself. The frontend proxies `/api` to the API, so other machines only need port 80.

- **Home network (LAN)**: `http://<lan-ip-of-host>`, for example `http://192.168.178.30`
- **Tailscale**: if Tailscale runs on the Docker host, the app is reachable from every device in the tailnet via `http://<host-name>` (MagicDNS) or `http://<tailscale-ip>`

The connection is plain HTTP. Traffic over Tailscale is encrypted by WireGuard; in the LAN it is not. For access from untrusted networks, bind the frontend to `127.0.0.1` as well (`'127.0.0.1:80:80'`) and publish it via `tailscale serve --bg 80`, which provides HTTPS under `https://<host-name>.<tailnet>.ts.net` (requires MagicDNS and HTTPS certificates to be enabled in the Tailscale admin console).

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

Docker Compose only reads `.env` from the project root automatically. To use a different file (e.g. `.env.production`), pass it explicitly:

```bash
docker compose --env-file .env.production up -d
```

Values that are not taken from variables, such as the database credentials in `DATABASE_URL`, are set directly in `docker-compose.yml`:

```yaml
api:
  environment:
    DATABASE_URL: postgresql://your_user:your_password@postgres:5432/dividends
```

### Custom Ports

To change the exposed ports, modify the `ports` section in `docker-compose.yml`:

```yaml
frontend:
  ports:
    - '8080:80'  # Access frontend on http://<host>:8080

api:
  ports:
    - '127.0.0.1:3001:3000'  # Access API on http://localhost:3001 (host only)
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
docker compose exec api npx prisma migrate deploy --config=prisma.config.ts
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

1. Check if migrations or the seed are failing:
   ```bash
   docker compose logs api
   ```
   Typical cause: `ADMIN_PASSWORD`, `DEFAULT_CURRENCY`, `DEFAULT_CURRENCY_NAME` or `JWT_SECRET` is not set in `.env`.

2. Verify database connection:
   ```bash
   docker compose exec api node -e "console.log(process.env.DATABASE_URL)"
   ```

3. Manually run migrations:
   ```bash
   docker compose exec api npx prisma migrate deploy --config=prisma.config.ts
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
- [ ] Set up proper environment variables (use `.env` file or secrets); use a strong, random `JWT_SECRET` and `ADMIN_PASSWORD`
- [ ] Keep `ALLOW_REGISTRATION=false` unless an additional account is needed
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
