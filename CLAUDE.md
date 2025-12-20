# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Architecture

This is an **Nx monorepo** containing a full-stack dividends tracking application with:

- **Backend API** (`apps/api`): NestJS application with Prisma ORM for PostgreSQL
- **Frontend** (`apps/dividends`): Angular 20 standalone application
- **Shared Library** (`packages/shared`): Common code shared between frontend and backend
- **E2E Tests** (`apps/api-e2e`): End-to-end tests for the API

### Key Architectural Details

**Database**: Uses PostgreSQL with Prisma ORM v7. The Prisma schema is located at `apps/api/prisma/schema.prisma` with a custom output directory for the generated client (`apps/api/generated/prisma`). A Docker Compose file provides a local PostgreSQL instance.

**Monorepo Path Aliases**: The shared library is accessible via the path alias `@dividends/shared` (defined in `tsconfig.base.json`). Both the API and Angular app can import from this shared package.

**Frontend-Backend Integration**: The Angular app (`dividends`) proxies API requests to the NestJS backend using `proxy.conf.json`. When serving the frontend, it automatically starts the API server first (via `dependsOn: ["api:serve"]` in `apps/dividends/project.json:53`).

**Build Configuration**:

- The API uses a custom Webpack configuration (`apps/api/webpack.config.js`) with the Nx Webpack plugin
- The Angular app uses Angular Build (application builder) with SCSS styling
- The API build generates a `package.json` for deployment via `generatePackageJson: true`

## Common Development Commands

### Running the Application

```bash
# Serve the full stack (starts API + Angular dev server)
nx serve dividends

# Serve only the API
nx serve api

# Build for production
nx build api
nx build dividends
```

### Database Commands

The project uses Prisma for database management. Both npm scripts (for convenience) and Nx targets are available:

```bash
# Generate Prisma Client (run after schema changes)
npm run db:generate
# or
nx run api:prisma-generate

# Push schema changes to database (prototyping)
npm run db:push
# or
nx run api:prisma-push

# Create and apply migration (development)
npm run db:migrate
# or
nx run api:prisma-migrate

# Create migration without applying
npm run db:migrate:create

# Apply pending migrations (production)
npm run db:migrate:deploy

# Check migration status
npm run db:migrate:status

# Open Prisma Studio to view/edit data
npm run db:studio
# or
nx run api:prisma-studio

# Seed the database
npm run db:seed

# Reset database (reapply all migrations)
npm run db:migrate:reset

# Reset database without seeds
npm run db:reset

# Format Prisma schema
npm run db:format

# Validate Prisma schema
npm run db:validate
```

### Docker Database

```bash
# Start PostgreSQL database
docker compose up -d

# Stop database
docker compose down

# Stop and remove volumes
docker compose down -v
```

### Testing

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

### Building

```bash
# Build a specific project
nx build api
nx build dividends

# Build all projects
nx run-many -t build

# Build affected projects only
nx affected -t build
```

### Deployment Preparation (API)

The API has special targets for deployment:

```bash
# Generate pruned lockfile and workspace modules for deployment
nx run api:prune
```

This runs both `prune-lockfile` and `copy-workspace-modules` to prepare the API for containerization or deployment.

### Visualizing the Project Graph

```bash
# Open interactive dependency graph
nx graph
```

## Project-Specific Notes

### API (NestJS)

- Entry point: `apps/api/src/main.ts`
- Global prefix: `/api` (all routes prefixed with `/api`)
- Default port: `3000` (configurable via `PORT` environment variable)
- Build output: `dist/apps/api`
- Uses TypeScript compilation via Webpack with the Nx App plugin
- **Prisma Configuration**: Schema at `apps/api/prisma/schema.prisma`, generated client at `apps/api/generated/prisma`
- **Environment**: Copy `apps/api/.env.example` to `apps/api/.env` and configure `DATABASE_URL`
- The API build uses a custom build command (`webpack-cli build`) instead of the standard Nx webpack executor

### Dividends (Angular)

- Standalone components architecture (no NgModule)
- Uses Angular 20 with the new application builder
- Styling: SCSS
- Entry point: `apps/dividends/src/main.ts`
- Build output: `dist/apps/dividends`
- Bundle budgets configured: 500kb warning / 1mb error for initial bundle
- Proxies `/api` requests to `http://localhost:3000` via `proxy.conf.json`

### Shared Package

- Location: `packages/shared`
- Import path: `@dividends/shared`
- Used by both API and frontend for shared types, utilities, etc.

## Environment Setup

1. **Node Version**: This project uses Node.js v25.2.1 (specified in `.nvmrc`)
2. **Database**: PostgreSQL 16 (use Docker Compose: `docker compose up -d`)
3. **Environment Variables**: Copy `apps/api/.env.example` to create `.env` file in the root or `apps/api/.env`

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->
