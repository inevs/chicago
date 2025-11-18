# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Architecture

This is an **Nx monorepo** containing a full-stack application with:

- **Backend API** (`apps/api`): NestJS application built with Webpack
- **Frontend** (`apps/dividends`): Angular 20 standalone application
- **Shared Library** (`packages/shared`): Common code shared between frontend and backend
- **E2E Tests** (`apps/api-e2e`): End-to-end tests for the API

### Key Architectural Details

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

### Dividends (Angular)

- Standalone components architecture (no NgModule)
- Uses Angular 20 with the new application builder
- Styling: SCSS
- Entry point: `apps/dividends/src/main.ts`
- Build output: `dist/apps/dividends`
- Bundle budgets configured: 500kb warning / 1mb error for initial bundle

### Shared Package

- Location: `packages/shared`
- Import path: `@dividends/shared`
- Used by both API and frontend for shared types, utilities, etc.

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
