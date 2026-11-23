# 11. Glossary

## Business Domain Terms

| Term | Definition |
|------|------------|
| **Dividend** | A distribution of a portion of a company's earnings to shareholders |
| **Ex-Date** | Ex-dividend date - the date on which a stock trades without the dividend |
| **Payout Date** | The date when the dividend is actually paid to shareholders |
| **Security** | A tradable financial asset (stock, bond, ETF) |
| **ISIN** | International Securities Identification Number - unique 12-character identifier |
| **WKN** | Wertpapierkennnummer - German 6-character alphanumeric security identifier |
| **Ticker/Symbol** | Short alphabetic code identifying a security (e.g., AAPL for Apple) |
| **EOD Price** | End-of-day price - closing price of a security |
| **Exchange Rate** | Rate at which one currency can be exchanged for another |
| **Base Currency** | The reference currency for conversions (exchange-rate sync is EUR-based; the default currency is configurable via `DEFAULT_CURRENCY`) |
| **Portfolio** | Collection of financial investments (securities) |
| **KPI** | Key Performance Indicator - metrics for tracking performance |

## Technical Terms

### Architecture & Patterns

| Term | Definition |
|------|------------|
| **Arc42** | Architecture documentation template with 12+ sections |
| **Monorepo** | Single repository containing multiple related projects |
| **Nx** | Build system for TypeScript/JavaScript monorepos |
| **Modular Architecture** | Architecture divided into independent, interchangeable modules |
| **Layered Architecture** | Architecture organized in horizontal layers (presentation, business, data) |
| **Repository Pattern** | Abstraction layer between business logic and data access |
| **Strategy Pattern** | Design pattern for selecting algorithms at runtime |
| **DTO** | Data Transfer Object - object for transferring data between layers |
| **ORM** | Object-Relational Mapping - technique for converting between incompatible type systems |
| **DI** | Dependency Injection - design pattern for loose coupling |
| **IoC** | Inversion of Control - principle where framework controls execution flow |

### Technologies

| Term | Definition |
|------|------------|
| **NestJS** | Progressive Node.js framework for building server-side applications |
| **Prisma** | Next-generation ORM for Node.js and TypeScript |
| **Angular** | Platform and framework for building single-page client applications |
| **Signals** | Angular's fine-grained reactivity primitive (introduced in Angular 16) |
| **Standalone Components** | Angular components without NgModule (Angular 14+) |
| **TypeScript** | Typed superset of JavaScript |
| **PostgreSQL** | Open-source relational database |
| **Swagger/OpenAPI** | API documentation specification and tools |
| **JWT** | JSON Web Token - standard for securely transmitting information |
| **REST** | Representational State Transfer - architectural style for APIs |

### Nx & Build Tools

| Term | Definition |
|------|------------|
| **Workspace** | Nx monorepo containing apps and libraries |
| **App** | Standalone application in the workspace |
| **Library** | Shared code package used by apps |
| **Target** | Executable task in Nx (build, serve, test, lint) |
| **Executor** | Nx plugin that runs a target |
| **Generator** | Nx tool for code generation and scaffolding |
| **Project Graph** | Visualization of dependencies between projects |
| **Affected** | Nx feature to run tasks only on changed projects |

### Database Terms

| Term | Definition |
|------|------------|
| **Schema** | Structure of the database (tables, columns, relationships) |
| **Migration** | Script to change database schema incrementally |
| **Seed** | Initial data loaded into database for development/testing |
| **Index** | Database structure to speed up data retrieval |
| **Constraint** | Rule enforced by the database (unique, foreign key, not null) |
| **Cascade Delete** | Automatic deletion of related records when parent is deleted |
| **Connection Pool** | Cache of database connections for reuse |
| **Decimal Precision** | Number of decimal places stored (e.g., Decimal(19,4)) |

### Testing Terms

| Term | Definition |
|------|------------|
| **Unit Test** | Test of a single function/class in isolation |
| **Integration Test** | Test of multiple components working together |
| **E2E Test** | End-to-end test simulating user behavior |
| **Mock** | Fake object replacing a real dependency in tests |
| **Stub** | Simple implementation of an interface for testing |
| **Spy** | Test double that records how it was called |
| **Test Coverage** | Percentage of code executed by tests |
| **Jest** | JavaScript testing framework (used for the API, the API e2e tests and the shared package) |
| **Vitest** | Vite-based testing framework with a Jest-compatible API (used for the Angular frontend) |
| **Supertest** | HTTP assertion library for testing APIs |

### Frontend Terms

| Term | Definition |
|------|------------|
| **Component** | Self-contained UI element with template, logic, and styles |
| **Smart Component** | Component connected to state/services (container) |
| **Presentational Component** | Pure UI component with inputs/outputs only |
| **Service** | Injectable class for business logic and data access |
| **Signal** | Reactive primitive that notifies consumers when value changes |
| **Computed** | Derived signal calculated from other signals |
| **Effect** | Side effect that runs when signals change |
| **Observable** | RxJS pattern for async event streams |
| **Pipe** | Function for transforming data in templates |
| **Directive** | Class that adds behavior to DOM elements |
| **Route** | URL path mapped to a component |
| **Lazy Loading** | Loading modules/components only when needed |

### Backend Terms

| Term | Definition |
|------|------------|
| **Module** | NestJS organizational unit grouping related functionality |
| **Controller** | Class handling HTTP requests and returning responses |
| **Service** | Injectable class containing business logic |
| **Provider** | Any class that can be injected via DI |
| **Guard** | Class determining if a request should be handled |
| **Interceptor** | Class that intercepts and transforms requests/responses |
| **Pipe** | Class transforming/validating input data |
| **Filter** | Class handling exceptions and errors |
| **Middleware** | Function executed before route handler |
| **Decorator** | Function modifying class/method behavior (@Injectable, @Get, etc.) |

### Validation Terms

| Term | Definition |
|------|------------|
| **class-validator** | Library for decorator-based validation |
| **ValidationPipe** | NestJS pipe for automatic DTO validation |
| **Whitelist** | List of allowed values (e.g., ISO 4217 currency codes) |
| **Transform** | Automatic conversion of input data (e.g., string to number) |
| **Custom Validator** | User-defined validation decorator |
| **ISO 4217** | International standard for currency codes (USD, EUR, etc.) |

### Quality Attributes

| Term | Definition |
|------|------------|
| **Maintainability** | Ease of maintaining and modifying code |
| **Extensibility** | Ease of adding new features |
| **Testability** | Ease of writing and running tests |
| **Reliability** | System's ability to perform consistently |
| **Availability** | Percentage of time system is operational |
| **Performance** | Speed and resource efficiency |
| **Scalability** | Ability to handle increased load |
| **Security** | Protection against unauthorized access and attacks |
| **Usability** | Ease of use for end users |
| **Accessibility** | Usability for users with disabilities |

### Anti-Patterns

| Term | Definition |
|------|------------|
| **God Object** | Object that knows/does too much (violates Single Responsibility) |
| **Spaghetti Code** | Code with complex, tangled control structure |
| **Magic Numbers** | Unexplained numeric constants in code |
| **Tight Coupling** | High dependency between modules/classes |
| **Hardcoding** | Embedding fixed values directly in code |
| **N+1 Query** | Performance issue where N queries follow an initial query |

### Design Principles

| Term | Definition |
|------|------------|
| **SOLID** | Five principles of object-oriented design |
| **SRP** | Single Responsibility Principle - class should have one reason to change |
| **DRY** | Don't Repeat Yourself - avoid code duplication |
| **KISS** | Keep It Simple, Stupid - prefer simplicity |
| **YAGNI** | You Aren't Gonna Need It - don't add unused features |
| **Separation of Concerns** | Separate program into distinct features with minimal overlap |
| **Defense in Depth** | Multiple layers of security controls |

### API Terms

| Term | Definition |
|------|------------|
| **Endpoint** | URL path accepting HTTP requests |
| **Query Parameter** | URL parameter for filtering/options (?page=1) |
| **Path Parameter** | URL segment for resource ID (/api/securities/:id) |
| **Request Body** | Data sent in POST/PUT/PATCH requests |
| **Response Status** | HTTP status code (200 OK, 404 Not Found, etc.) |
| **Pagination** | Dividing large result sets into pages |
| **Rate Limiting** | Limiting number of requests per time period |
| **CORS** | Cross-Origin Resource Sharing - security feature |
| **Idempotent** | Operation that produces same result when repeated |

### Data Terms

| Term | Definition |
|------|------------|
| **Immutable** | Data that cannot be changed after creation |
| **Audit Trail** | Record of changes for accountability |
| **Snapshot** | Point-in-time copy of data |
| **Serialization** | Converting object to storable/transmittable format |
| **Deserialization** | Converting stored data back to object |
| **Normalization** | Organizing data to reduce redundancy |
| **Denormalization** | Adding redundancy for performance |

### External Services

| Term | Definition |
|------|------------|
| **Yahoo Finance** | Provider of financial market data and prices |
| **ECB** | European Central Bank - provides EUR exchange rate data |
| **API Provider** | Third-party service offering data via API |
| **CSV** | Comma-Separated Values - text file format |

## Abbreviations

| Abbreviation | Full Term |
|--------------|-----------|
| **API** | Application Programming Interface |
| **CRUD** | Create, Read, Update, Delete |
| **DB** | Database |
| **DTO** | Data Transfer Object |
| **E2E** | End-to-End |
| **HTTP** | Hypertext Transfer Protocol |
| **ID** | Identifier |
| **JSON** | JavaScript Object Notation |
| **KPI** | Key Performance Indicator |
| **OHLC** | Open, High, Low, Close (price data) |
| **ORM** | Object-Relational Mapping |
| **REST** | Representational State Transfer |
| **SQL** | Structured Query Language |
| **UI** | User Interface |
| **URL** | Uniform Resource Locator |
| **UUID** | Universally Unique Identifier |
| **XSS** | Cross-Site Scripting |

## Project-Specific Terms

| Term | Definition |
|------|------------|
| **DiviTrack** | Name of this dividend tracking application |
| **Chicago** | Internal code name for the project |
| **UiStateService** | Angular service for UI state (modals, theme, sidebar, time range) |
| **PortfolioStateService** | Angular service holding portfolio data as signals |
| **TransactionFacade** | Angular service orchestrating CRUD, import/export and CSV import workflows (replaces most of the former `AppStateService`) |
| **PaginationStateService** | Angular service for client-side pagination state |
| **PriceUpdateSchedulerService** | Service for the daily scheduled price update (07:00 server time) |
| **@dividends/shared** | Shared library package with common types |
| **api** | Backend NestJS application |
| **dividends** | Frontend Angular application |
| **api-e2e** | End-to-end tests for the API |
