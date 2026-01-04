# Architecture Review (arc42)

Date: 2025-02-14
Scope: Chicago monorepo (apps/api, apps/dividends, packages/shared)

## 1. Introduction and Goals
- Goal: track dividends, securities, transactions, and market data with import/export and analytics.
- Stakeholders: end users managing portfolios; developers maintaining the stack.

## 2. Constraints
- Nx monorepo with NestJS (API), Angular (frontend), Prisma (ORM), PostgreSQL (DB).
- Shared types/utilities in packages/shared via @dividends/shared.
- Node version constraints are inconsistent across .nvmrc, docs, and Docker images.

## 3. Context and Scope
- UI (Angular) -> API (NestJS) -> DB (PostgreSQL via Prisma).
- API -> external data providers (ECB exchange rates, Yahoo Finance prices).
- Frontend proxies /api to backend in dev.

## 4. Solution Strategy
- Domain-based NestJS modules for core entities.
- Standalone Angular components and per-domain services.
- Shared types to align contracts between frontend and backend.
- Scheduled background sync for market data.

## 5. Building Block View
- Backend modules: securities, dividend-payments, security-transactions, currencies,
  exchange-rates, security-prices, data.
- Frontend: pages + services per domain, shared UI components.
- Shared package: DTOs, enums, and utilities used across API and UI.

## 6. Runtime View
- CRUD flows: UI service -> API controller/service -> Prisma -> DB.
- Import/export: JSON payloads aggregated in data module.
- Daily scheduler for price sync with exchange-rate sync.

## 7. Deployment View
- Dev: nx serve dividends plus Docker Compose Postgres.
- Prod: docker-compose for API + frontend + Postgres.

## 8. Crosscutting Concepts
- Validation: global pipe and per-controller pipes, with inconsistent rules.
- Error handling: NestJS exceptions with service-level error mapping on frontend.
- Serialization: shared types define numbers/Date, but API returns Prisma records directly in some modules.
- Logging: Nest Logger; no centralized tracing.

## 9. Architecture Decisions
- Monorepo with Nx to coordinate build/test and enforce module boundaries.
- Prisma with generated client under apps/api/generated/prisma.
- In-process scheduler for market data updates.

## 10. Quality Requirements
- Data correctness for financial computations.
- Stable API contracts between API and frontend.
- Maintainability across multiple domains and shared types.

## 11. Risks and Technical Debt
- Decimal/Date serialization mismatch between Prisma and shared types can break UI calculations.
- Docker healthcheck targets /api/health but no endpoint exists; API container can be unhealthy.
- Import/export contract drift (exchangeRates included server-side, omitted in API schema and UI types).
- Multiple PrismaService providers across modules can create multiple PrismaClient instances.
- In-process cron job will run once per API instance; scaling may duplicate work.
- Node version mismatch across docs/.nvmrc/Dockerfiles may cause inconsistent dev/prod behavior.

## 12. Glossary
- Security: financial instrument (stock/ETF/bond).
- Dividend Payment: payout event with dates, amounts, and currency conversion.
- Security Transaction: buy/sell event with pricing and fees.
- Security Price: historical price entry from market data provider.
- Exchange Rate: daily conversion rate between currencies.

## Findings (Improvements and Inconsistencies)
- Add a real health endpoint or update the compose healthcheck target.
- Standardize Decimal/Date serialization for API responses.
- Use a single PrismaService provider (central module) to avoid multiple PrismaClient instances.
- Align controller validation policies (global vs per-controller, and include currencies).
- Align import/export schema and frontend types to include exchangeRates (or remove it everywhere).
- Decide on cron scheduling strategy for multi-instance deployments.
- Align Node versions across .nvmrc, docs, and Docker images.
