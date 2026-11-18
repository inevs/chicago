# 3. Context and Scope

## 3.1 Business Context

```
┌─────────────────────────────────────────────────────────────┐
│                      External Systems                        │
└─────────────────────────────────────────────────────────────┘
                               ▲
                               │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         │                    │                    │
    Price Data          Exchange Rates      User Input
  (Yahoo Finance)    (ECB EUR-based)       (Browser)
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                    DiviTrack Application                     │
│                                                              │
│  ┌────────────────┐              ┌─────────────────┐       │
│  │   Angular UI   │◄────────────►│   NestJS API    │       │
│  │  (Port 4200)   │   REST API   │   (Port 3000)   │       │
│  └────────────────┘              └────────┬────────┘       │
│                                            │                 │
│                                            ▼                 │
│                                   ┌─────────────────┐       │
│                                   │   PostgreSQL    │       │
│                                   │   (Port 5432)   │       │
│                                   └─────────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │  JSON Backups   │
                      │  (Export/Import)│
                      └─────────────────┘
```

### External Interfaces

| Interface | Direction | Description |
|-----------|-----------|-------------|
| **Yahoo Finance API** | Inbound | Fetch end-of-day security prices via HTTP |
| **ECB Exchange Rate API** | Inbound | Fetch daily EUR exchange rates via HTTP (CSV format) |
| **User Browser** | Bidirectional | Angular SPA communicates with NestJS API via REST |
| **File System** | Outbound | Export data as JSON for backup |
| **File System** | Inbound | Import data from JSON for migration/restore |
| **File System** | Inbound | Import securities, dividend payments and transactions from CSV (multipart upload) |

## 3.2 Technical Context

### Frontend (Angular)

| Aspect | Technology/Pattern |
|--------|-------------------|
| **Framework** | Angular 22 (standalone components) |
| **State Management** | Signals in focused state services (`UiStateService`, `PortfolioStateService`, `TransactionFacade`, `PaginationStateService`) |
| **HTTP Client** | Angular HttpClient |
| **Routing** | Angular Router (lazy-loaded routes, `authGuard`) |
| **HTTP Interceptors** | `authInterceptor` (bearer token), `errorInterceptor` |
| **Styling** | Tailwind CSS v4, SCSS |
| **Build** | Angular Build (application builder) |

### Backend (NestJS)

| Aspect | Technology/Pattern |
|--------|-------------------|
| **Framework** | NestJS 12 (Express-based) |
| **Architecture** | Modular (feature-based modules) |
| **Database ORM** | Prisma 7 (schema-first) |
| **Validation** | class-validator decorators |
| **API Documentation** | OpenAPI/Swagger |
| **Scheduling** | @nestjs/schedule (cron jobs) |
| **Authentication** | Passport (JWT + local strategy), bcryptjs |
| **Error Handling** | Global exception filter (`GlobalExceptionFilter`) |
| **Health Checks** | @nestjs/terminus (`/api/health`, `/api/health/db`) |
| **Build** | Webpack with Nx plugin |

### Data Layer

| Aspect | Technology |
|--------|-----------|
| **Database** | PostgreSQL 16 |
| **Schema Management** | Prisma Migrate |
| **Connection** | Prisma Client with connection pooling |
| **Indexes** | Composite indexes on foreign keys and query patterns |
| **Constraints** | Unique constraints, foreign keys, cascading deletes |

## 3.3 Communication Patterns

### Frontend ↔ Backend

- **Protocol**: HTTP/REST over JSON
- **Base URL**: `/api` (proxied in development via `proxy.conf.json`)
- **Authentication**: JWT bearer token; single-user mode, self-registration disabled unless `ALLOW_REGISTRATION=true`
- **Error Handling**: HTTP status codes + structured error responses
- **Content Type**: `application/json`

### Backend ↔ Database

- **Connection**: Prisma Client (connection pooling)
- **Query Pattern**: Repository pattern; services access the database only through typed repositories (`*.repository.ts`) that wrap Prisma
- **Transactions**: Limited usage (opportunity for improvement)
- **Migration**: Prisma Migrate for schema changes

### Backend ↔ External APIs

- **Yahoo Finance**: HTTP GET requests to chart API
- **ECB**: HTTP GET requests to data API (CSV response)
- **Error Handling**: Yahoo Finance requests are retried with exponential backoff on rate limiting (HTTP 429); other errors are not retried; no retries for ECB; timeout: 30 seconds
- **Rate Limiting**: Manual delays (1 second between requests, both for ECB and Yahoo Finance)
