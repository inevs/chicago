# 5. Building Block View

## 5.1 Level 1: System Context

```
┌─────────────────────────────────────────────────────────────┐
│                     DiviTrack System                         │
│                                                              │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │   Frontend   │  │   Backend     │  │    Database     │  │
│  │   (Angular)  │──│   (NestJS)    │──│  (PostgreSQL)   │  │
│  └──────────────┘  └───────────────┘  └─────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 5.2 Level 2: Backend Structure

### Module Organization

```
api/
├── src/
│   ├── app/
│   │   ├── auth/                    # JWT authentication (guards, strategies, DTOs)
│   │   ├── common/filters/          # GlobalExceptionFilter
│   │   ├── health/                  # Health checks (@nestjs/terminus)
│   │   ├── securities/              # Security management
│   │   ├── dividend-payments/       # Dividend tracking
│   │   ├── security-transactions/   # Buy/sell transactions
│   │   ├── currencies/              # Currency management
│   │   ├── exchange-rates/          # Exchange rate sync
│   │   ├── security-prices/         # Price history
│   │   ├── data/                    # Import/export
│   │   ├── database/                # DatabaseModule (global: PrismaService + repositories)
│   │   └── app.module.ts
│   ├── testing/                     # Test factories and integration test helper
│   ├── prisma.service.ts            # Prisma client (single instance, provided by DatabaseModule)
│   └── main.ts                      # Application bootstrap
└── prisma/
    └── schema.prisma                # Database schema
```

### Module Structure (Feature-Based)

Each feature module follows this pattern:

```
feature-name/
├── feature-name.module.ts           # NestJS module declaration
├── feature-name.controller.ts       # HTTP endpoints
├── feature-name.service.ts          # Business logic
├── feature-name.service.spec.ts     # Unit tests
├── feature-name.repository.ts       # Data access (Prisma queries), provided by DatabaseModule
├── feature-name.repository.spec.ts  # Repository unit tests
├── dto/
│   ├── create-feature.dto.ts        # Input validation
│   ├── update-feature.dto.ts        # Update validation
│   └── query-feature.dto.ts         # Query parameters (optional)
├── validators/                      # Custom validators (optional)
└── constants/                       # Feature-specific constants (optional)
```

### Core Modules

All domain controllers are protected with `@UseGuards(JwtAuthGuard)`; only `/api/auth/login`, `/api/auth/register` and `/api/health` are public.

#### 0. Auth Module

**Responsibility**: Authentication (single-user mode)

**Components**:
- `AuthController`: `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/profile`
- `AuthService`: Credential validation with bcryptjs, JWT issuing
- Strategies/Guards: `LocalStrategy`/`LocalAuthGuard`, `JwtStrategy`/`JwtAuthGuard`

**Key Operations**:
- Login with email and password, returns a JWT
- Registration disabled by default (only with `ALLOW_REGISTRATION=true`)
- `JWT_SECRET` is required; the module fails to start without it
- No roles/RBAC; the `User` model has no relation to domain data

#### Health Module

**Responsibility**: Liveness and database checks

**Components**:
- `HealthController`: `GET /api/health`, `GET /api/health/db` (public)
- `PrismaHealthIndicator`: Database connectivity check

#### 1. Securities Module

**Responsibility**: Manage securities (stocks, ETFs, bonds)

**Components**:
- `SecuritiesController`: Create, read, update, search and CSV import endpoints (no DELETE)
- `SecuritiesService`: Business logic, validation
- DTOs: CreateSecurityDto, UpdateSecurityDto, ImportSecuritiesCsvDto

**Key Operations**:
- Create/update/read securities
- Search by name, symbol, ISIN, WKN
- Validate currency references
- CSV import (`POST /api/securities/import/csv`)

#### 2. Dividend Payments Module

**Responsibility**: Track dividend payments

**Components**:
- `DividendPaymentsController`: CRUD and CSV import endpoints
- `DividendPaymentsService`: Dividend calculations
- DTOs: CreateDividendPaymentDto, UpdateDividendPaymentDto, ImportDividendsCsvDto

**Key Operations**:
- Record dividend payments with multi-currency support
- Calculate net payments after taxes
- Link to securities
- CSV import (`POST /api/dividend-payments/import/csv`)

#### 3. Security Transactions Module

**Responsibility**: Track buy/sell transactions

**Components**:
- `SecurityTransactionsController`: CRUD and CSV import endpoints
- `SecurityTransactionsService`: Transaction logic
- DTOs: CreateSecurityTransactionDto, UpdateSecurityTransactionDto, ImportSecurityTransactionsCsvDto

**Key Operations**:
- Record BUY/SELL transactions
- Calculate total value with fees
- Multi-currency support with exchange rates
- CSV import (`POST /api/security-transactions/import/csv`)

#### 4. Currencies Module

**Responsibility**: Manage ISO 4217 currencies

**Components**:
- `CurrenciesController`: List, create and default-currency endpoints
- `CurrenciesService`: Currency validation
- Custom Validator: `@IsISO4217Code()`
- Constants: ISO 4217 whitelist (124 codes, `iso-4217-codes.ts`)

**Key Operations**:
- Add currencies with ISO 4217 validation; exchange rates for the new currency are synced in the background
- List all currencies
- Get default currency (`DEFAULT_CURRENCY`, fallback EUR)

#### 5. Exchange Rates Module

**Responsibility**: Sync and provide exchange rates

**Components**:
- `ExchangeRatesController`: Sync endpoints
- `ExchangeRatesService`: ECB API integration

**Key Operations**:
- Sync EUR-based rates from ECB
- Fetch rates for specific date ranges
- Get exchange rate for calculations

**External Dependency**: ECB Data API

#### 6. Security Prices Module

**Responsibility**: Sync and provide EOD prices

**Components**:
- `SecurityPricesController`: Sync and query endpoints
- `SecurityPricesService`: Yahoo Finance integration
- `PriceUpdateSchedulerService`: Daily scheduled price update (`@Cron`, 07:00 server time, always active)

**Key Operations**:
- Sync EOD prices from Yahoo Finance (retry with exponential backoff on rate limiting)
- Auto-sync exchange rates after each price sync
- Get latest price per security
- Store OHLCV data

**External Dependency**: Yahoo Finance API

#### 7. Data Module

**Responsibility**: Import/export all data

**Components**:
- `DataController`: Export/import endpoints
- `DataService`: JSON serialization

**Key Operations**:
- Export entire database to JSON
- Import from JSON (merge, or replace via `clearExisting`)
- Bulk operations with transaction support

## 5.3 Level 2: Frontend Structure

### Component Organization

```
dividends/
├── src/
│   ├── app/
│   │   ├── guards/                  # authGuard
│   │   ├── interceptors/            # authInterceptor, errorInterceptor
│   │   ├── layout/                  # Layout components
│   │   │   ├── header-nav/
│   │   │   ├── sidebar-nav/
│   │   │   └── main-layout/
│   │   ├── pages/                   # Route components (smart)
│   │   │   ├── login/
│   │   │   ├── overview/
│   │   │   ├── portfolio/
│   │   │   ├── all-securities/
│   │   │   ├── dividends/
│   │   │   ├── security-transactions/
│   │   │   ├── analyses/
│   │   │   └── transactions/        # Not routed (/transaktionen redirects to /dividenden)
│   │   ├── shared/                  # Reusable components
│   │   │   ├── charts/              # Chart.js defaults
│   │   │   ├── modals/              # incl. import-confirm-modal
│   │   │   ├── tables/
│   │   │   ├── inputs/
│   │   │   └── toast-container/
│   │   ├── services/                # Angular services
│   │   │   ├── ui-state.service.ts
│   │   │   ├── portfolio-state.service.ts
│   │   │   ├── transaction-facade.service.ts
│   │   │   ├── pagination-state.service.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── security.service.ts
│   │   │   ├── dividend-payment.service.ts
│   │   │   └── ...
│   │   ├── models/                  # TypeScript interfaces
│   │   └── app.routes.ts
│   └── main.ts
```

### Key Components

#### Smart Components (Pages)

| Component | Responsibility |
|-----------|---------------|
| **LoginComponent** | Login form (Signal Forms) |
| **OverviewComponent** | Dashboard with KPIs, charts, recent activity |
| **PortfolioComponent** | Securities summary with latest prices |
| **AllSecuritiesComponent** | List of all securities with search and sorting |
| **DividendsComponent** | Dividend payment list with filtering |
| **SecurityTransactionsComponent** | Buy/sell transaction management |
| **AnalysesComponent** | Charts and analytics |

#### Presentational Components

| Component | Responsibility |
|-----------|---------------|
| **TransactionModal** | Form for adding/editing dividend payments |
| **SecurityModal** | Form for adding/editing securities |
| **SecurityTransactionModal** | Form for buy/sell transactions |
| **CurrencyModal** | Form for adding currencies |
| **ImportConfirmModal** | Confirmation dialog for JSON data import (choice of import mode) |
| **TransactionTable** | Display dividend payments |
| **SecurityTransactionTable** | Display buy/sell transactions |
| **SecurityAutocomplete** | Searchable security selector |
| **FieldErrors** | Shows the validation messages of a Signal Forms field below the input |
| **DecimalInput** | Signal Forms control for decimal numbers with comma as decimal separator |

#### Services

| Service | Responsibility |
|---------|---------------|
| **UiStateService** | UI state (modals, theme, sidebar, time range, editing selections) |
| **PortfolioStateService** | Portfolio data state as signals; `MainLayoutComponent` (root layout) loads all data whenever `AuthService.isAuthenticated` becomes true (startup with token, login) and clears it on logout |
| **TransactionFacade** | Orchestrates create/update/delete, JSON import/export and CSV import workflows (~585 lines) |
| **PaginationStateService** | Client-side pagination state |
| **AuthService** | Login/logout, token storage in localStorage |
| **ExchangeRateService** | HTTP calls for exchange rates |
| **SecurityService** | HTTP calls for securities |
| **DividendPaymentService** | HTTP calls for dividends |
| **SecurityTransactionService** | HTTP calls for transactions; converts the decimal fields the API sends as strings (quantity, price, fees, exchange rate, total value) to numbers |
| **CurrencyService** | HTTP calls for currencies |
| **SecurityPriceService** | HTTP calls for prices |
| **DataService** | Import/export operations |
| **ToastService** | Toast notifications |
| **DividendDataService** | Dividend calculations and filtering |

## 5.4 Level 3: Shared Package

**Location**: `packages/shared/src/lib/shared.ts`

**Purpose**: Share TypeScript interfaces and types between frontend and backend

**Contents**:
- Domain model interfaces (Security, DividendPayment, etc.)
- DTOs (CreateCurrencyDto, CreateDividendPaymentDto, UpdateDividendPaymentDto, CreateSecurityTransactionDto, UpdateSecurityTransactionDto)
- Enums (SecurityType, TransactionType)
- CSV import result types (ImportCsvResponse, ImportTransactionsCsvResponse, ImportDividendsCsvResponse, etc.)
- `CurrencyConverter` utility class and `CURRENCY_ERRORS` constants

**Benefits**:
- Type safety across the stack
- Single source of truth for data structures
- Refactoring safety

## 5.5 Data Model (Database)

### Core Entities

```
Currency
  ├── (1:N) → Security
  ├── (1:N) → DividendPayment (origin)
  ├── (1:N) → DividendPayment (dest)
  ├── (1:N) → SecurityTransaction
  └── (1:N) → ExchangeRate (base and target)

Security
  ├── (1:N) → DividendPayment
  ├── (1:N) → SecurityTransaction
  └── (1:N) → SecurityPrice

DividendPayment (payment record)
SecurityTransaction (buy/sell record)
SecurityPrice (EOD price history)
ExchangeRate (historical rates)

User (login credentials; no relation to domain data)
```

### Key Database Patterns

**Indexes**:
- Foreign keys indexed for joins
- Composite indexes for common queries (e.g., `securityId + date`)
- Unique constraints for duplicate prevention

**Cascading Deletes**:
- Deleting a security cascades to dividends, transactions, prices

**Precision**:
- `Decimal(19, 8)` for shares, exchange rates (high precision)
- `Decimal(19, 4)` for money amounts
- `Decimal(19, 6)` for prices

**Audit Fields**:
- `createdAt`, `updatedAt` on all tables except `Currency` (only `createdAt`)
