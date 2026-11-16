# 2. Architecture Constraints

## 2.1 Technical Constraints

| Constraint | Description | Impact |
|------------|-------------|--------|
| **Nx Monorepo** | Application is structured as an Nx monorepo | Enforces consistent tooling, shared dependencies, and modular architecture |
| **Node.js v24** | Backend requires Node.js 24.22.3 | Limits deployment environments, benefits from latest Node.js features |
| **PostgreSQL** | Database is PostgreSQL 16+ | Requires PostgreSQL in deployment, benefits from JSONB, robust indexing |
| **TypeScript** | Entire codebase is TypeScript | Provides type safety but requires compilation step |
| **Prisma ORM** | Database access via Prisma v7 | Schema-first approach, custom output directory required |
| **Self-Hosted** | Application is self-hosted by users | No cloud dependencies, users manage their own data and infrastructure |

## 2.2 Organizational Constraints

| Constraint | Description |
|------------|-------------|
| **Single Developer** | Project appears to be developed by a single developer |
| **Open Source** | Project is open source (implied by structure) |
| **German Language** | Primary interface language is German |

## 2.3 Conventions

| Convention | Implementation |
|------------|----------------|
| **Code Style** | ESLint for linting, Prettier for formatting (configured in Nx) |
| **Git Workflow** | Main branch for releases, feature branches |
| **Testing** | Jest for unit/integration tests |
| **API Documentation** | OpenAPI/Swagger for REST API documentation |
| **Database Naming** | Plural table names (e.g., `securities`, `currencies`) |
| **DTO Validation** | class-validator decorators for input validation |

## 2.4 External Dependencies

### External APIs
- **Yahoo Finance** (`query1.finance.yahoo.com`): Security price data
- **ECB (European Central Bank)** (`data-api.ecb.europa.eu`): EUR-based exchange rates

### Technology Stack
- **Backend**: NestJS 12, Prisma 7, class-validator, axios
- **Frontend**: Angular 22 (standalone components), RxJS, Signals
- **Build Tools**: Nx 24, Webpack 5, esbuild
- **Database**: PostgreSQL 16
- **Containerization**: Docker & Docker Compose for local development

## 2.5 Limitations

| Limitation | Rationale |
|------------|-----------|
| **EUR Base Currency** | Exchange rate provider (ECB) only provides EUR-based rates |
| **Yahoo Finance Dependency** | Price data relies on Yahoo Finance API availability |
| **No Real-time Data** | End-of-day prices only, no intraday quotes |
| **Single-User Mode** | JWT authentication, but data is not scoped per user; self-registration is disabled by default (`ALLOW_REGISTRATION`) |
| **No Multi-tenancy** | Application designed for single user/household |
