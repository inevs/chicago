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
│   │   ├── securities/              # Security management
│   │   ├── dividend-payments/       # Dividend tracking
│   │   ├── security-transactions/   # Buy/sell transactions
│   │   ├── currencies/              # Currency management
│   │   ├── exchange-rates/          # Exchange rate sync
│   │   ├── security-prices/         # Price history
│   │   ├── data/                    # Import/export
│   │   └── app.module.ts
│   ├── prisma.service.ts            # Prisma client singleton
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
├── dto/
│   ├── create-feature.dto.ts        # Input validation
│   ├── update-feature.dto.ts        # Update validation
│   └── query-feature.dto.ts         # Query parameters (optional)
├── validators/                      # Custom validators (optional)
└── constants/                       # Feature-specific constants (optional)
```

### Core Modules

#### 1. Securities Module

**Responsibility**: Manage securities (stocks, ETFs, bonds)

**Components**:
- `SecuritiesController`: CRUD endpoints
- `SecuritiesService`: Business logic, validation
- DTOs: CreateSecurityDto, UpdateSecurityDto

**Key Operations**:
- Create/update/read securities
- Search by name, symbol, ISIN, WKN
- Validate currency references

#### 2. Dividend Payments Module

**Responsibility**: Track dividend payments

**Components**:
- `DividendPaymentsController`: CRUD endpoints
- `DividendPaymentsService`: Dividend calculations
- DTOs: CreateDividendPaymentDto, UpdateDividendPaymentDto

**Key Operations**:
- Record dividend payments with multi-currency support
- Calculate net payments after taxes
- Link to securities

#### 3. Security Transactions Module

**Responsibility**: Track buy/sell transactions

**Components**:
- `SecurityTransactionsController`: CRUD endpoints
- `SecurityTransactionsService`: Transaction logic
- DTOs: CreateSecurityTransactionDto, UpdateSecurityTransactionDto

**Key Operations**:
- Record BUY/SELL transactions
- Calculate total value with fees
- Multi-currency support with exchange rates

#### 4. Currencies Module

**Responsibility**: Manage ISO 4217 currencies

**Components**:
- `CurrenciesController`: CRUD endpoints
- `CurrenciesService`: Currency validation
- Custom Validator: `@IsISO4217Code()`
- Constants: ISO 4217 whitelist (140+ codes)

**Key Operations**:
- Add currencies with ISO 4217 validation
- List all currencies
- Get default currency (EUR)

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
- `PriceUpdateSchedulerService`: Scheduled syncing (optional)

**Key Operations**:
- Sync EOD prices from Yahoo Finance
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
- Import from JSON (merge or replace)
- Bulk operations with transaction support

## 5.3 Level 2: Frontend Structure

### Component Organization

```
dividends/
├── src/
│   ├── app/
│   │   ├── layout/                  # Layout components
│   │   │   ├── header-nav/
│   │   │   ├── sidebar-nav/
│   │   │   └── main-layout/
│   │   ├── pages/                   # Route components (smart)
│   │   │   ├── overview/
│   │   │   ├── portfolio/
│   │   │   ├── dividends/
│   │   │   ├── security-transactions/
│   │   │   └── analyses/
│   │   ├── shared/                  # Reusable components
│   │   │   ├── modals/
│   │   │   ├── tables/
│   │   │   ├── inputs/
│   │   │   └── toast-container/
│   │   ├── services/                # Angular services
│   │   │   ├── app-state.service.ts
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
| **OverviewComponent** | Dashboard with KPIs, charts, recent activity |
| **PortfolioComponent** | Securities summary with latest prices |
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
| **TransactionTable** | Display dividend payments |
| **SecurityTransactionTable** | Display buy/sell transactions |
| **SecurityAutocomplete** | Searchable security selector |

#### Services

| Service | Responsibility |
|---------|---------------|
| **AppStateService** | Centralized app state (UI, modals, data) |
| **SecurityService** | HTTP calls for securities |
| **DividendPaymentService** | HTTP calls for dividends |
| **SecurityTransactionService** | HTTP calls for transactions |
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
- DTOs (CreateSecurityDto, UpdateDividendPaymentDto, etc.)
- Enums (SecurityType, TransactionType)

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
- `createdAt`, `updatedAt` on all tables
