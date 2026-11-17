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

### 2. Start the database

Use Docker Compose to start a local PostgreSQL instance:

```bash
docker compose up -d
```

This starts PostgreSQL 16 on `localhost:5432` with default credentials configured for local development.

### 3. Set up environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

The default configuration works with the Docker Compose database:

```env
DATABASE_URL="postgresql://dividends:dividends@localhost:5432/dividends?schema=public"
```

The application runs in single-user mode. The login user is created by the database seed from `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_NAME`. Self-registration (`POST /api/auth/register`) is disabled by default and returns `403 Forbidden`; set `ALLOW_REGISTRATION=true` only if you need it, because data is not separated per user and every account can access all data.

### 4. Set up the database schema

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations to set up the database schema
npm run db:migrate

# (Optional) Seed the database with sample data
npm run db:seed
```

### 5. Start the application

```bash
# Start both API and frontend (recommended)
nx serve dividends

# Or start only the API
nx serve api
```

The API will be available at `http://localhost:3000/api` and the frontend at `http://localhost:4200`.

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
```

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
docker compose up -d

# Stop database
docker compose down

# Stop and remove volumes (WARNING: deletes all data)
docker compose down -v

# View database logs
docker compose logs db
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
# Seed the database with sample data
npm run db:seed

# Reset database without running seeds
npm run db:reset
```

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
│   │   │   └── seed.ts         # Database seeding script
│   │   ├── generated/          # Generated Prisma client
│   │   └── webpack.config.js   # Custom Webpack configuration
│   ├── api-e2e/                # API end-to-end tests
│   └── dividends/              # Angular frontend
│       ├── src/
│       │   ├── app/            # Application components
│       │   └── main.ts         # Application entry point
│       └── proxy.conf.json     # Dev server proxy configuration
├── packages/
│   └── shared/                 # Shared library (@dividends/shared)
│       └── src/                # Shared types and utilities
├── docker-compose.yml          # PostgreSQL database setup
├── .nvmrc                      # Node version specification
└── package.json                # Root package configuration
```

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
