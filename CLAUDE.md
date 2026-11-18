# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Architecture

This is an **Nx monorepo** containing a full-stack dividends tracking application with:

- **Backend API** (`apps/api`): NestJS application with Prisma ORM for PostgreSQL
- **Frontend** (`apps/dividends`): Angular 22 standalone application
- **Shared Library** (`packages/shared`): Common code shared between frontend and backend
- **E2E Tests** (`apps/api-e2e`): End-to-end tests for the API

**Test runners**: The API and API e2e tests use Jest (`jest.config.ts`, `jest.preset.js`, `@nx/jest/plugin`); the Angular app uses Vitest through the Angular unit-test builder.

### Key Architectural Details

**Database**: Uses PostgreSQL with Prisma ORM v7. The Prisma schema is located at `apps/api/prisma/schema.prisma` with a custom output directory for the generated client (`apps/api/generated/prisma`). A Docker Compose file provides a local PostgreSQL instance.

**Monorepo Path Aliases**: The shared library is accessible via the path alias `@dividends/shared` (defined in `tsconfig.base.json`). Both the API and Angular app can import from this shared package.

**Frontend-Backend Integration**: The Angular app (`dividends`) proxies API requests to the NestJS backend using `proxy.conf.json`. When serving the frontend, it automatically starts the API server first (via `dependsOn: ["api:serve"]` in `apps/dividends/project.json:53`).

**Build Configuration**:

- The API uses a custom Webpack configuration (`apps/api/webpack.config.js`) with the Nx Webpack plugin
- The Angular app uses Angular Build (application builder) with SCSS component styles and Tailwind CSS v4 (configured CSS-first in `apps/dividends/src/styles.css`, wired up via `.postcssrc.json`)
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

### Docker

`docker-compose.yml` defines three services: `postgres`, `api` and `frontend` (nginx). See `docs/DOCKER.md` for details.

```bash
# Start only the PostgreSQL database (for local development with nx serve)
docker compose up -d postgres

# Build and start the full stack (requires .env with JWT_SECRET, ADMIN_PASSWORD, DEFAULT_CURRENCY, DEFAULT_CURRENCY_NAME)
docker compose up -d

# Stop all services
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

# Run API e2e tests (requires running PostgreSQL, e.g. `docker compose up -d postgres`)
# Uses a separate database `<db>_e2e` derived from DATABASE_URL (or E2E_DATABASE_URL);
# it is created and migrated automatically and all its data is deleted by the tests.
nx e2e api-e2e
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
- **Repository pattern**: Services never inject `PrismaService`; all database access goes through typed repositories (`<feature>/<feature>.repository.ts`, plus `auth/users.repository.ts` and `data/data-import.repository.ts`). The global `DatabaseModule` (`apps/api/src/app/database/database.module.ts`) provides the single `PrismaService` instance and all repositories, so feature modules must not register `PrismaService` themselves. Service specs mock the repositories; repository specs mock `PrismaService`
- **Environment**: Copy `.env.example` to `.env` and configure `DATABASE_URL`
- The API build uses a custom build command (`webpack-cli build`) instead of the standard Nx webpack executor

### Dividends (Angular)

- Standalone components architecture (no NgModule)
- Uses Angular 22 with the new application builder
- Styling: Tailwind CSS v4 (global `src/styles.css`, no `tailwind.config.js`) plus SCSS component styles; component styles that use `@apply` need `@reference` to `styles.css`
- Entry point: `apps/dividends/src/main.ts`
- Build output: `dist/apps/dividends`
- Bundle budgets configured: 500kb warning / 1mb error for initial bundle
- Proxies `/api` requests to `http://localhost:3000` via `proxy.conf.json`
- Zoneless change detection (Angular default, no `provideZoneChangeDetection`, no `zone.js` dependency or polyfill); all components use `ChangeDetectionStrategy.OnPush`, enforced by the lint rule `@angular-eslint/prefer-on-push-component-change-detection` (`error`). Template state must be signals (or trigger change detection explicitly)
- Unit tests run with Vitest via the `@angular/build:unit-test` builder (`test` target in `apps/dividends/project.json`, jsdom, `isolate: true`); there is no `jest.config.ts` or `test-setup.ts`, the builder initializes TestBed itself (zoneless). Use `vi.*` APIs and Vitest fake timers (`fakeAsync` is not supported with Vitest); with fake timers, advance the timers (e.g. `vi.advanceTimersByTimeAsync`) before `fixture.whenStable()`, because the zoneless scheduler runs change detection from a timer. Spec files are type-checked during the test build.

### Shared Package

- Location: `packages/shared`
- Import path: `@dividends/shared`
- Used by both API and frontend for shared types, utilities, etc.

## Environment Setup

1. **Node Version**: This project uses Node.js v24.22.3 (specified in `.nvmrc`)
2. **Database**: PostgreSQL 16 (use Docker Compose: `docker compose up -d postgres`)
3. **Environment Variables**: Copy `.env.example` (project root) to `.env` in the root or `apps/api/.env`
4. **Claude Code cloud sessions**: The SessionStart hook `.claude/hooks/session-start.sh` (registered in `.claude/settings.json`, runs only when `CLAUDE_CODE_REMOTE=true`) installs the Node.js version from `.nvmrc` via nvm, puts it on the `PATH`, runs `npm install --legacy-peer-deps` and `npm run db:generate`. Installs are skipped when the relevant files are unchanged (hashes in `node_modules/` and `apps/api/generated/prisma/`).
5. **Dependency install scripts**: npm (11.19 and later) skips install scripts of dependencies that are not approved in the `allowScripts` field of `package.json` and lists them as `npm warn install-scripts`. `@scarf/scarf` (install telemetry, pulled in via `swagger-ui-dist`) is explicitly denied. The remaining listed scripts are not approved because the prebuilt platform binaries ship as optional dependencies; the resulting warnings are expected.

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

- update the test suites after changes to prevent regressions
- create new tests for new functionality
- always run 'nx run-many -t test' to ensure the tests still run successfully
- after changes to code, configuration, Docker setup, environment variables, scripts or dependencies, and always before creating a commit, run the `update-docs` skill (`.claude/skills/update-docs/SKILL.md`) to check and update the affected documentation (`docs/`, `README.md`, `CLAUDE.md`, `AGENTS.md`)
