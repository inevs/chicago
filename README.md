# Dividends

A full-stack application for tracking dividends built with NestJS, Angular, and PostgreSQL in an Nx monorepo.

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

## Architecture

This monorepo contains:

- **Backend API** (`apps/api`) - NestJS application with Prisma ORM
- **Frontend** (`apps/dividends`) - Angular 20 standalone application
- **Shared Library** (`packages/shared`) - Shared code between frontend and backend
- **E2E Tests** (`apps/api-e2e`) - End-to-end tests for the API

## Prerequisites

- Node.js (LTS version recommended)
- PostgreSQL database
- npm or yarn

## Getting Started

### 1. Install dependencies

```sh
npm install
```

### 2. Set up environment variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dividends?schema=public"
PORT=3000
```

### 3. Set up the database

```sh
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Seed the database
npm run db:seed
```

### 4. Start the application

```sh
# Start both API and frontend (recommended)
nx serve dividends

# Or start only the API
nx serve api
```

The API will be available at `http://localhost:3000/api` and the frontend at `http://localhost:4200`.

## Development Commands

### Running Applications

```sh
# Serve the full stack (starts API + Angular dev server)
nx serve dividends

# Serve only the API
nx serve api
```

### Building

```sh
# Build a specific project
nx build api
nx build dividends

# Build all projects
nx run-many -t build
```

### Testing

```sh
# Run tests for a specific project
nx test api
nx test dividends
nx test shared

# Run tests for all projects
nx run-many -t test
```

### Linting

```sh
# Lint a specific project
nx lint api
nx lint dividends

# Lint all projects
nx run-many -t lint
```

## Database Commands

### Core Operations

```sh
# Generate Prisma Client (run after schema changes)
npm run db:generate

# Push schema changes to database (prototyping)
npm run db:push

# Open Prisma Studio to view/edit data
npm run db:studio
```

### Migrations

```sh
# Create and apply a new migration (development)
npm run db:migrate

# Create migration without applying
npm run db:migrate:create

# Apply pending migrations (production)
npm run db:migrate:deploy

# Check migration status
npm run db:migrate:status

# Reset database and reapply all migrations
npm run db:migrate:reset
```

### Utilities

```sh
# Seed the database
npm run db:seed

# Reset database without seeds
npm run db:reset

# Format Prisma schema
npm run db:format

# Validate Prisma schema
npm run db:validate
```

## Project Structure

```
dividends/
├── apps/
│   ├── api/              # NestJS backend
│   │   ├── src/
│   │   └── prisma/       # Database schema and migrations
│   ├── api-e2e/          # API E2E tests
│   └── dividends/        # Angular frontend
├── packages/
│   └── shared/           # Shared library (@dividends/shared)
└── package.json
```

## Visualizing Dependencies

```sh
# Open interactive project graph
nx graph
```

## Set up CI!

### Step 1

To connect to Nx Cloud, run the following command:

```sh
npx nx connect
```

Connecting to Nx Cloud ensures a [fast and scalable CI](https://nx.dev/ci/intro/why-nx-cloud?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) pipeline. It includes features such as:

- [Remote caching](https://nx.dev/ci/features/remote-cache?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task distribution across multiple machines](https://nx.dev/ci/features/distribute-task-execution?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Automated e2e test splitting](https://nx.dev/ci/features/split-e2e-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task flakiness detection and rerunning](https://nx.dev/ci/features/flaky-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

### Step 2

Use the following command to configure a CI workflow for your workspace:

```sh
npx nx g ci-workflow
```

[Learn more about Nx on CI](https://nx.dev/ci/intro/ci-with-nx#ready-get-started-with-your-provider?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Install Nx Console

Nx Console is an editor extension that enriches your developer experience. It lets you run tasks, generate code, and improves code autocompletion in your IDE. It is available for VSCode and IntelliJ.

[Install Nx Console &raquo;](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Useful links

Learn more:

- [Learn more about this workspace setup](https://nx.dev/nx-api/js?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects)
- [Learn about Nx on CI](https://nx.dev/ci/intro/ci-with-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Releasing Packages with Nx release](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

And join the Nx community:
- [Discord](https://go.nx.dev/community)
- [Follow us on X](https://twitter.com/nxdevtools) or [LinkedIn](https://www.linkedin.com/company/nrwl)
- [Our Youtube channel](https://www.youtube.com/@nxdevtools)
- [Our blog](https://nx.dev/blog?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
