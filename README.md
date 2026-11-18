# Dividends

A full-stack dividends tracking application built with NestJS, Angular, and PostgreSQL in an Nx monorepo.

## Tech Stack

- **Backend**: NestJS 12 with Prisma ORM 7
- **Frontend**: Angular 22 (standalone components)
- **Database**: PostgreSQL 16
- **Monorepo**: Nx 24
- **Styling**: Tailwind CSS v4 and SCSS

## Architecture

This monorepo contains:

- **Backend API** (`apps/api`) - NestJS application with Prisma ORM for PostgreSQL
- **Frontend** (`apps/dividends`) - Angular 22 standalone application
- **Shared Library** (`packages/shared`) - Shared types and utilities (`@dividends/shared`)
- **E2E Tests** (`apps/api-e2e`) - End-to-end tests for the API

**Key Features**:
- Frontend automatically proxies `/api` requests to the backend via `proxy.conf.json`
- Running `nx serve dividends` automatically starts the API server first
- Prisma schema located at `apps/api/prisma/schema.prisma` with custom client output to `apps/api/generated/prisma`

## Prerequisites

- Node.js v24.22.3 (see `.nvmrc`)
- Docker and Docker Compose (for PostgreSQL)
- npm

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

`DATABASE_URL` already matches the Docker Compose database:

```env
DATABASE_URL="postgresql://dividends:dividends@localhost:5432/dividends?schema=public"
```

Review the remaining variables and replace the placeholders:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Connection string to PostgreSQL |
| `JWT_SECRET` | yes | Secret for signing access tokens; the API does not start without it |
| `ADMIN_PASSWORD` | yes | Password of the login user created by the seed |
| `ADMIN_EMAIL`, `ADMIN_NAME` | no | Login user created by the seed (defaults: `admin@example.com`, `Admin User`) |
| `DEFAULT_CURRENCY`, `DEFAULT_CURRENCY_NAME` | yes | Default currency created by the seed (e.g. `EUR`, `Euro`) |
| `ALLOW_REGISTRATION` | no | Enables `POST /api/auth/register` (default `false`) |
| `SECURITY_PRICE_HISTORY_START` | no | Start date for historical price and exchange-rate sync (default `2017-01-01`) |
| `SEED_SAMPLE_DATA` | no | `true` makes the seed create sample securities, transactions and dividends (default `false`, see [Set up the database schema](#4-set-up-the-database-schema)) |

The application runs in single-user mode. The login user is created by the database seed from `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_NAME`. Self-registration (`POST /api/auth/register`) is disabled by default and returns `403 Forbidden`; set `ALLOW_REGISTRATION=true` only if you need it, because data is not separated per user and every account can access all data.

### 3. Start the database

Use Docker Compose to start only the PostgreSQL service:

```bash
docker compose up -d postgres
```

This starts PostgreSQL 16 on `localhost:5432` with default credentials configured for local development.

Note: `docker compose up -d` without a service name builds and starts the complete stack (database, API and frontend). The API container then occupies port 3000 and conflicts with `nx serve`. See [Running with Docker](#running-with-docker).

### 4. Set up the database schema

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations to set up the database schema
npm run db:migrate

# Seed the database (creates the login user and the default currency)
npm run db:seed
```

The seed is required for logging in, because it creates the only user account. It aborts if `ADMIN_PASSWORD`, `DEFAULT_CURRENCY` or `DEFAULT_CURRENCY_NAME` is missing.

To try the application with data, set `SEED_SAMPLE_DATA=true` before seeding. The seed then also creates 12 securities, transactions and dividend payments derived from the import samples in `docs/samples` (defined in `apps/api/prisma/sample-data.ts`). Sample data is only created if the database contains no securities yet and `DEFAULT_CURRENCY` is `EUR`; otherwise the seed skips it and logs the reason.

### 5. Start the application

```bash
# Start both API and frontend (recommended)
nx serve dividends

# Or start only the API
nx serve api
```

The API will be available at `http://localhost:3000/api` and the frontend at `http://localhost:4200`. The interactive API documentation (Swagger UI) is served at `http://localhost:3000/api/docs`.

Note: Running `nx serve dividends` automatically starts the backend API first before starting the frontend dev server.

## Development Commands

### Running Applications

```bash
# Serve the full stack (starts API + Angular dev server)
nx serve dividends

# Serve only the API
nx serve api
```

### Building

```bash
# Build a specific project
nx build api
nx build dividends

# Build all projects
nx run-many -t build

# Build only affected projects (based on git changes)
nx affected -t build
```

### Testing

The API and the API e2e tests use Jest; the Angular frontend uses Vitest (via the Angular `@angular/build:unit-test` builder).

```bash
# Run tests for a specific project
nx test api
nx test dividends
nx test shared

# Run tests for all projects
nx run-many -t test

# Run tests for affected projects only
nx affected -t test

# Run API end-to-end tests (requires a running PostgreSQL)
nx e2e api-e2e
```

The e2e tests use a separate database `<db>_e2e` derived from `DATABASE_URL` (or `E2E_DATABASE_URL`). It is created and migrated automatically, and the tests delete all its data.

### Linting

```bash
# Lint a specific project
nx lint api
nx lint dividends

# Lint all projects
nx run-many -t lint

# Lint affected projects only
nx affected -t lint
```

## Database Commands

All database commands use Prisma with a custom configuration file (`apps/api/prisma.config.ts`). The Prisma schema is located at `apps/api/prisma/schema.prisma`.

### Docker Database Management

```bash
# Start PostgreSQL database
docker compose up -d postgres

# Stop database
docker compose stop postgres

# Stop all services and remove volumes (WARNING: deletes all data)
docker compose down -v

# View database logs
docker compose logs postgres
```

### Prisma Core Operations

```bash
# Generate Prisma Client (run after schema changes)
npm run db:generate

# Push schema changes to database (prototyping, skips migrations)
npm run db:push

# Open Prisma Studio to view/edit data in browser
npm run db:studio

# Format Prisma schema file
npm run db:format

# Validate Prisma schema for errors
npm run db:validate
```

### Migrations

```bash
# Create and apply a new migration (development)
npm run db:migrate

# Create migration file without applying it
npm run db:migrate:create

# Apply pending migrations (production)
npm run db:migrate:deploy

# Check migration status
npm run db:migrate:status

# Reset database and reapply all migrations (WARNING: deletes all data)
npm run db:migrate:reset
```

### Data Management

```bash
# Seed the database (login user and default currency)
npm run db:seed

# Seed including sample securities, transactions and dividends (empty database, EUR only)
SEED_SAMPLE_DATA=true npm run db:seed

# Reset database without running seeds
npm run db:reset
```

## Running with Docker

`docker-compose.yml` defines three services that together run the complete application:

| Service | Description | Port |
|---|---|---|
| `postgres` | PostgreSQL 16 database | `127.0.0.1:5432` |
| `api` | NestJS API (`apps/api/Dockerfile`) | `127.0.0.1:3000` |
| `frontend` | Angular app served by nginx, proxies `/api` to the API (`apps/dividends/Dockerfile`) | `80` (all interfaces) |

Docker Compose reads the variables from the `.env` file in the project root. Set at least `JWT_SECRET`, `ADMIN_PASSWORD`, `DEFAULT_CURRENCY` and `DEFAULT_CURRENCY_NAME` before the first start (see [Set up environment variables](#2-set-up-environment-variables)).

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Stop all services and remove volumes (WARNING: deletes all data)
docker compose down -v
```

On every start, the API container applies pending migrations (`prisma migrate deploy`), runs the seed and then starts the server. The seed only creates the login user and the default currency if they do not exist yet and marks `DEFAULT_CURRENCY` as the default currency; changing `ADMIN_PASSWORD` later does not update an existing password. With `SEED_SAMPLE_DATA=true`, the first start on an empty database also creates the sample data.

The application is then available at `http://localhost`. Stop any running `nx serve` processes first, because the API container uses port 3000.

Details on configuration, access from other machines and Podman are described in [docs/DOCKER.md](docs/DOCKER.md).

## Deployment

### API Deployment Preparation

The API has special targets to prepare it for containerization or deployment:

```bash
# Generate pruned lockfile and copy workspace modules
nx run api:prune
```

This runs both `prune-lockfile` and `copy-workspace-modules` to prepare the API build with only the necessary dependencies.

## Project Structure

```
chicago/
├── apps/
│   ├── api/                    # NestJS backend API
│   │   ├── src/                # Application source code
│   │   ├── prisma/             # Database schema and migrations
│   │   │   ├── schema.prisma   # Prisma schema definition
│   │   │   ├── migrations/     # Database migration files
│   │   │   ├── seed.ts         # Database seeding script
│   │   │   └── sample-data.ts  # Sample data for SEED_SAMPLE_DATA=true
│   │   ├── generated/          # Generated Prisma client
│   │   ├── prisma.config.ts    # Prisma configuration used by the npm db:* scripts
│   │   ├── Dockerfile          # API container image
│   │   └── webpack.config.js   # Custom Webpack configuration
│   ├── api-e2e/                # API end-to-end tests
│   └── dividends/              # Angular frontend
│       ├── src/
│       │   ├── app/            # Application components
│       │   └── main.ts         # Application entry point
│       ├── Dockerfile          # Frontend container image (nginx)
│       ├── nginx.conf          # nginx configuration incl. /api proxy
│       └── proxy.conf.json     # Dev server proxy configuration
├── packages/
│   └── shared/                 # Shared library (@dividends/shared)
│       └── src/                # Shared types and utilities
├── docs/                       # Project documentation (Docker, features, architecture)
├── docker-compose.yml          # Full stack: PostgreSQL, API and frontend
├── .env.example                # Template for environment variables
├── .nvmrc                      # Node version specification
└── package.json                # Root package configuration
```

## Further Documentation

- [docs/DOCKER.md](docs/DOCKER.md) - Docker and Podman deployment
- [docs/architecture/](docs/architecture/README.md) - Architecture documentation (arc42)
- [docs/CURRENCY_FEATURE.md](docs/CURRENCY_FEATURE.md) - Currencies and exchange rates
- [docs/SECURITY_PRICES.md](docs/SECURITY_PRICES.md) - End-of-day security prices
- [docs/TOAST_NOTIFICATION_SYSTEM.md](docs/TOAST_NOTIFICATION_SYSTEM.md) - Toast notifications in the frontend

## Nx Workspace Tools

### Visualizing Dependencies

```bash
# Open interactive project graph
nx graph
```

### Nx Console

Nx Console is an editor extension that lets you run tasks, generate code, and improves code autocompletion. Available for VSCode and IntelliJ.

[Install Nx Console](https://nx.dev/getting-started/editor-setup)

### CI/CD

To set up continuous integration with Nx Cloud (optional):

```bash
npx nx connect
```

Learn more about [Nx on CI](https://nx.dev/ci/intro/ci-with-nx).

## Resources

- [Nx Documentation](https://nx.dev)
- [Angular Documentation](https://angular.dev)
- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
