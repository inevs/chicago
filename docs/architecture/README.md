# DiviTrack Architecture Documentation

> **Arc42 Architecture Documentation Template**
>
> This documentation follows the Arc42 template for software architecture documentation.
> It provides a comprehensive view of the DiviTrack application's architecture, focusing on
> maintainability and extensibility.

## 📋 Document Overview

This architecture documentation is organized according to the Arc42 template:

### Core Documentation

| Section | Title | Focus | Status |
|---------|-------|-------|--------|
| [01](./01-introduction-and-goals.md) | Introduction and Goals | Business context, quality goals, stakeholders | ✅ Complete |
| [02](./02-constraints.md) | Architecture Constraints | Technical and organizational constraints | ✅ Complete |
| [03](./03-context-and-scope.md) | Context and Scope | System boundaries and interfaces | ✅ Complete |
| [04](./04-solution-strategy.md) | Solution Strategy | Technology decisions and patterns | ✅ Complete |
| [05](./05-building-blocks.md) | Building Block View | System decomposition and modules | ✅ Complete |
| [08](./08-cross-cutting-concepts.md) | Cross-Cutting Concepts | Validation, error handling, security | ✅ Complete |
| [10](./10-quality-requirements.md) | Quality Requirements | Quality scenarios and assessments | ✅ Complete |
| [11](./11-glossary.md) | Glossary | Domain and technical terms | ✅ Complete |
| [12](./12-improvement-recommendations.md) | **Improvement Recommendations** | **Actionable improvements for maintainability & extensibility** | ✅ Complete |

### Quick Start

**For Developers**: Start with [Building Blocks (05)](./05-building-blocks.md) to understand the codebase structure.

**For Architects**: Start with [Solution Strategy (04)](./04-solution-strategy.md) to understand key design decisions.

**For Product Owners**: Start with [Introduction and Goals (01)](./01-introduction-and-goals.md) for business context.

**For Improving the Codebase**: Start with [Improvement Recommendations (12)](./12-improvement-recommendations.md) for prioritized, actionable improvements.

## 🎯 Key Findings Summary

### Strengths

1. ✅ **Clean Modular Architecture**: Well-organized Nx monorepo with clear separation of concerns
2. ✅ **Modern Tech Stack**: Angular 22 (Signals), NestJS, Prisma ORM, PostgreSQL
3. ✅ **Type Safety**: Full TypeScript stack with shared types between frontend and backend
4. ✅ **Good Validation**: Multi-layer validation (client, server, database)
5. ✅ **Comprehensive API Docs**: OpenAPI/Swagger documentation
6. ✅ **Data Integrity**: Proper database constraints and indexes

### Open Security & Operations Issues

Authentication (JWT, single-user mode), centralized error handling (`GlobalExceptionFilter`), health checks (`/api/health`, `/api/health/db`) and request logging (`RequestLoggingMiddleware`) are implemented. Still missing:

1. ❌ **No Rate Limiting, Security Headers or Explicit CORS Configuration**: no throttling, no `helmet`

### Maintainability Concerns

1. ⚠️ **Large TransactionFacade** (~585 lines): The former `AppStateService` was split into `UiStateService`, `PortfolioStateService`, `TransactionFacade` and `PaginationStateService`, but the facade is still large
2. ⚠️ **Test Coverage Not Measured**: 63 `*.spec.ts` files (unit, integration and `api-e2e` tests), but no coverage figures are collected
3. ⚠️ **Hardcoded Providers**: Exchange rate and price providers not extensible

### Extensibility Gaps

1. ⚠️ **EUR-Based Exchange Rates**: The default currency is configurable (`DEFAULT_CURRENCY`), but exchange-rate sync (ECB) is still EUR-based
2. ⚠️ **Provider Coupling**: Cannot easily swap external API providers
3. ⚠️ **No Server-Side Pagination**: The API returns complete lists; the frontend paginates client-side
4. ⚠️ **No Caching Strategy**: Repeated queries for static data

## 🚀 Improvement Roadmap

### Phase 1: Security & Stability (Week 1-2)
- Add authentication & authorization (done: JWT, single-user mode)
- Add centralized error handling (done)
- Add health checks (done)
- Add request logging (done)
- Add rate limiting and security headers (open)

**Impact**: Enables production deployment with proper security

### Phase 2: Maintainability (Week 3-4)
- Refactor AppStateService into focused services (done; `TransactionFacade` remains large)
- Add comprehensive unit and integration tests (in progress: unit, integration and e2e tests exist)
- Add pagination to list endpoints (open; currently client-side only)

**Impact**: Easier to maintain and extend codebase

### Phase 3: Extensibility (Week 5-6)
- Implement repository pattern (done)
- Add provider abstractions (strategy pattern)
- Make base currency configurable (partially done: `DEFAULT_CURRENCY`; exchange-rate sync still EUR-based)

**Impact**: Easier to add new features and providers

### Phase 4: Polish & Optimization (Week 7-8)
- Add caching layer
- Standardize error messages
- Add response compression

**Impact**: Better performance and user experience

## 📊 Quality Metrics

| Quality Attribute | Current Score | Target | Priority |
|------------------|---------------|--------|----------|
| **Security** | 3/5 ⚠️ | 4/5 | P1 |
| **Error Handling** | 2/5 ⚠️ | 4/5 | P0 |
| **Maintainability** | 3/5 ⚠️ | 4/5 | P1 |
| **Testability** | 3/5 ⚠️ | 4/5 | P1 |
| **Extensibility** | 3/5 ⚠️ | 4/5 | P2 |
| **Performance** | 4/5 ✅ | 4/5 | P3 |
| **Data Integrity** | 4/5 ✅ | 4/5 | - |

## 🏗️ Architecture Patterns

### Current Architecture

```
┌─────────────────────────────────────────┐
│          Angular Frontend               │
│  (Signals, Standalone Components)       │
└────────────┬────────────────────────────┘
             │ HTTP/REST
             ▼
┌─────────────────────────────────────────┐
│           NestJS Backend                │
│    (Modular, Controller-Service)        │
├─────────────────────────────────────────┤
│   Repositories → Prisma ORM Layer       │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│         PostgreSQL Database             │
└─────────────────────────────────────────┘
```

### Recommended Improvements

**Backend**: Add provider abstractions (strategy pattern) for exchange rates and prices
**Frontend**: Further split `TransactionFacade` into smaller units
**Security**: Add rate limiting, security headers (`helmet`) and explicit CORS configuration
**Monitoring**: Extend structured logging beyond request logs (health checks and request logging exist)
**Scaling**: Add server-side pagination and caching

## 📖 Related Documentation

### Feature Documentation
- [Currency Management](../CURRENCY_FEATURE.md)
- [Security Prices (EOD)](../SECURITY_PRICES.md)
- [Toast Notification System](../TOAST_NOTIFICATION_SYSTEM.md)

### How-To Guides
- [Docker Setup](../DOCKER.md)

### Root Documentation
- [Project README](../../README.md)
- [Claude.md (Development Guide)](../../CLAUDE.md)

## 🤝 Contributing to Architecture

When making architectural changes:

1. **Review** the relevant Arc42 section first
2. **Follow** the patterns documented here
3. **Update** this documentation if you change architecture
4. **Consider** the quality requirements in section 10
5. **Prioritize** based on the improvement recommendations in section 12

## 📝 Document Maintenance

| Aspect | Details |
|--------|---------|
| **Last Review** | 2026-11-17 |
| **Review Frequency** | Quarterly or after major changes |
| **Owners** | Development Team |
| **Template** | [Arc42](https://arc42.org/) |

## 🔍 Navigation Tips

**Find information about**:
- Business requirements → [Section 01](./01-introduction-and-goals.md)
- Technology stack → [Section 02](./02-constraints.md)
- External systems → [Section 03](./03-context-and-scope.md)
- Design decisions → [Section 04](./04-solution-strategy.md)
- Code structure → [Section 05](./05-building-blocks.md)
- Validation, errors, security → [Section 08](./08-cross-cutting-concepts.md)
- Quality goals → [Section 10](./10-quality-requirements.md)
- What to improve → [Section 12](./12-improvement-recommendations.md)
- Terminology → [Section 11](./11-glossary.md)

---

**Document Version**: 1.0
**Architecture Template**: Arc42
**Project**: DiviTrack (Chicago)
**Status**: Initial Architecture Review Complete
