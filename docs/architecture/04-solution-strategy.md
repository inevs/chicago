# 4. Solution Strategy

## 4.1 Technology Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| **Nx Monorepo** | Unified tooling, shared code, consistent build process | Learning curve, tooling complexity |
| **NestJS** | Enterprise-grade Node.js framework, excellent TypeScript support, built-in DI | Opinionated structure, learning curve |
| **Angular 22 (Standalone)** | Modern reactive patterns (Signals), no NgModules, excellent TypeScript support | Breaking changes from older Angular, ecosystem maturity |
| **Prisma ORM** | Type-safe database access, excellent migrations, schema-first approach | Limited to specific databases, generated code bulk |
| **PostgreSQL** | ACID compliance, robust indexing, JSONB support for flexibility | Requires PostgreSQL knowledge, more complex than SQLite |
| **Signals (Angular)** | Fine-grained reactivity, better performance than Zones, simpler than RxJS for state | Relatively new API, less ecosystem maturity; the app still uses Zone.js (`provideZoneChangeDetection`), zoneless change detection is not yet enabled |

## 4.2 Architectural Patterns

### Backend Architecture

**Pattern**: **Layered Architecture with Feature Modules**

```
┌─────────────────────────────────────────┐
│          Controllers Layer              │  (HTTP handling, validation)
├─────────────────────────────────────────┤
│           Services Layer                │  (Business logic)
├─────────────────────────────────────────┤
│         Data Access Layer               │  (Prisma ORM)
├─────────────────────────────────────────┤
│            Database                     │  (PostgreSQL)
└─────────────────────────────────────────┘
```

**Benefits**:
- Clear separation of concerns
- Each layer has a single responsibility
- Easy to test individual layers

**Current Implementation Gaps**:
- ❌ No repository abstraction (services directly use Prisma)
- ✅ Centralized exception handling via `GlobalExceptionFilter` (registered in `main.ts`)
- ❌ Limited transaction management
- ❌ No caching layer

### Frontend Architecture

**Pattern**: **Component-Based with Centralized State**

```
┌─────────────────────────────────────────┐
│        Smart Components                 │  (Page-level, connected to state)
│          (Container)                    │
├─────────────────────────────────────────┤
│       Presentational Components         │  (Reusable, input/output only)
│           (UI Components)               │
├─────────────────────────────────────────┤
│          Services Layer                 │  (HTTP, state, business logic)
│   (state services + domain services)    │
├─────────────────────────────────────────┤
│            HTTP Client                  │  (API communication)
└─────────────────────────────────────────┘
```

**Benefits**:
- Reusable presentational components
- Centralized state management via Signals
- Clear data flow

**Current Implementation Gaps**:
- ⚠️ `TransactionFacade` is still large (~585 lines) after `AppStateService` was split into focused services
- ❌ No state persistence beyond localStorage
- ❌ Limited error recovery mechanisms
- ❌ No optimistic UI updates

## 4.3 Key Design Decisions

### 1. Multi-Currency Support

**Decision**: ISO 4217 validation with EUR as base currency

**Implementation**:
- Whitelist-based ISO 4217 validation on the server; the client only checks for a 3-letter code
- EUR-based exchange rates from ECB
- Currency conversion stored with transactions (immutable)

**Rationale**: Ensures data integrity, provides audit trail, supports multiple currencies

**Trade-off**: Exchange-rate sync is EUR-only; the default currency can be set via `DEFAULT_CURRENCY`

### 2. Data Synchronization Strategy

**Decision**: Pull-based synchronization with manual triggers and a daily scheduled price update

**Implementation**:
- `/api/security-prices/sync` endpoint
- `/api/exchange-rates/sync` endpoint
- `PriceUpdateSchedulerService`: daily `@Cron` job at 07:00 server time (always active) that updates security prices
- Each price sync also syncs exchange rates for the same date range
- Exchange rates for a newly added currency are synced in the background

**Rationale**: User control over data fetches, avoids API rate limits

**Trade-off**: End-of-day data only; prices and rates may be up to one day old

### 3. Validation Strategy

**Decision**: Multi-layer validation (client + server)

**Implementation**:
- Client: Signal Forms (`@angular/forms/signals`) with a validation schema in all forms (login and modals); messages are shown below the affected field
- Server: class-validator decorators on DTOs
- Database: Constraints and unique indexes

**Rationale**: Defense in depth, better UX (client), security (server), integrity (database)

**Trade-off**: Code duplication, maintenance overhead

### 4. State Management

**Decision**: Signal-based reactive state split into focused services

**Implementation**:
- `UiStateService` (UI/modal state), `PortfolioStateService` (portfolio data), `TransactionFacade` (CRUD orchestration), `PaginationStateService` (client-side pagination) hold state as signals
- Computed signals for derived data
- Services for HTTP and domain logic

**Rationale**: Modern Angular pattern, fine-grained reactivity, better performance

**Trade-off**: `TransactionFacade` is still large, potential for tight coupling

## 4.4 Quality Approaches

| Quality Goal | Approach | Implementation Status |
|--------------|----------|----------------------|
| **Maintainability** | Modular architecture, TypeScript, consistent patterns | ✅ Good module structure, ⚠️ Some large files |
| **Data Integrity** | Multi-layer validation, database constraints | ✅ Good validation, ⚠️ Limited transactions |
| **Extensibility** | Feature modules, shared library, dependency injection | ✅ Good foundation, ⚠️ Some tight coupling |
| **Performance** | Indexes, signal-based reactivity, connection pooling | ✅ Good DB indexes, ⚠️ No caching strategy |
| **Testability** | Jest (API) and Vitest (frontend) configured, service injection, test factories | ⚠️ Coverage not measured (unit, integration and e2e tests exist) |
| **Security** | Input validation, parameterized queries (Prisma) | ✅ JWT authentication (single-user mode), ❌ No rate limiting |

## 4.5 Organizational Strategy

**Development Workflow**:
1. Feature development in separate modules
2. Shared types/interfaces in `@dividends/shared` package
3. Database changes via Prisma migrations
4. API documentation auto-generated via Swagger

**Deployment Strategy**:
- Self-hosted deployment model
- Dockerfiles for API and frontend (nginx), `docker-compose.yml` with `postgres`, `api` and `frontend` services
- Production: Manual deployment (no CI/CD configured)
- Database migrations: Manual via `prisma migrate deploy`
