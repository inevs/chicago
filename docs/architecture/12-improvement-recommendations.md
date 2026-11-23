# 12. Improvement Recommendations

> **Focus**: Maintainability and Extensibility
>
> This document provides prioritized, actionable recommendations to improve the codebase's maintainability and extensibility while addressing critical quality gaps.
>
> Each issue carries a **Status** line reflecting the current code: ✅ Implemented, ⚠️ Partial, ❌ Open. Problem descriptions and code examples reflect the state at the time of the original review and are kept for reference.

## 12.1 Critical Issues (Security & Reliability)

### Issue 1: No Authentication/Authorization ❌ CRITICAL

**Status**: ✅ Authentication implemented / ❌ Authorization open — JWT authentication in `apps/api/src/app/auth/` (Passport local + JWT strategies), `JwtAuthGuard` on all domain controllers, self-registration disabled by default via `ALLOW_REGISTRATION`. Role-based access control and per-user data ownership are not implemented (single-user mode: every account can access all data).

**Problem**:
- All API endpoints are completely open
- No user authentication
- No authorization checks
- No audit trail of who did what

**Impact**:
- Anyone with network access can read/modify data
- No multi-user support possible
- Compliance issues for financial data

**Recommendation**:

```typescript
// 1. Add authentication module
@Module({
  imports: [JwtModule.register({ ... })],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}

// 2. Add guards to protect endpoints
@Controller('securities')
@UseGuards(JwtAuthGuard)
export class SecuritiesController {
  // Now protected
}

// 3. Optional: Role-based access
@Controller('data')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class DataController {
  // Only admins can import/export
}
```

**Effort**: 16-24 hours
**Priority**: P0 (Critical)
**Files to Create**:
- `apps/api/src/app/auth/auth.module.ts`
- `apps/api/src/app/auth/auth.service.ts`
- `apps/api/src/app/auth/auth.controller.ts`
- `apps/api/src/app/auth/guards/jwt-auth.guard.ts`
- `apps/api/src/app/auth/strategies/jwt.strategy.ts`

---

### Issue 2: No Centralized Error Handling

**Status**: ✅ Implemented — `apps/api/src/app/common/filters/global-exception.filter.ts` (registered globally in `main.ts`, consistent response format with a `correlationId` per error) and the functional `errorInterceptor` in `apps/dividends/src/app/interceptors/error.interceptor.ts`.

**Problem**:
- Error responses are inconsistent across controllers
- Some errors logged, some not
- No correlation IDs for debugging
- Frontend error handling duplicated

**Impact**:
- Difficult debugging
- Inconsistent user experience
- Missing error data for monitoring

**Recommendation**:

**Backend**:
```typescript
// Global exception filter
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.message
      : 'Internal server error';

    // Log error with context
    this.logger.error({
      correlationId: request.correlationId,
      path: request.url,
      method: request.method,
      status,
      message,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId: request.correlationId,
    });
  }
}

// Register in main.ts
app.useGlobalFilters(new GlobalExceptionFilter());
```

**Frontend**:
```typescript
// HTTP interceptor for consistent error handling
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private toastService: ToastService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<any> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // Extract message
        const message = this.extractErrorMessage(error);

        // Show toast
        this.toastService.error(message);

        // Log to console in dev
        if (!environment.production) {
          console.error('HTTP Error:', error);
        }

        return throwError(() => error);
      })
    );
  }
}
```

**Effort**: 8 hours
**Priority**: P0 (Critical)
**Files to Create**:
- `apps/api/src/app/common/filters/global-exception.filter.ts`
- `apps/dividends/src/app/interceptors/error.interceptor.ts`

---

### Issue 3: Missing Health Checks

**Status**: ⚠️ Partial — `apps/api/src/app/health/` with `@nestjs/terminus` provides `GET /api/health` and `GET /api/health/db` (database ping). Checks for the external providers (ECB, Yahoo Finance) are open.

**Problem**:
- No way to monitor API health
- No database connection status endpoint
- External API status unknown
- Deployment health checks not possible

**Recommendation**:

```typescript
// Health check module
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}

// Health controller
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
  ) {}

  @Get()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }
}
```

**Effort**: 4 hours
**Priority**: P1 (High)
**Package**: `@nestjs/terminus`

---

## 12.2 Maintainability Improvements

### Issue 4: AppStateService God Object Anti-Pattern

**Status**: ✅ Implemented — `AppStateService` has been removed and split into `ui-state.service.ts`, `portfolio-state.service.ts`, `transaction-facade.service.ts` and `pagination-state.service.ts`. `TransactionFacadeService` (~585 lines) is now the largest frontend service and a candidate for further splitting.

**Problem**:
- AppStateService has 590+ lines
- Handles UI state, data loading, modals, form submission, import/export
- Violates Single Responsibility Principle
- Difficult to test
- High coupling

**Current Responsibilities**:
1. Theme management
2. Sidebar state
3. Time range selection
4. Modal state (5 different modals)
5. Data loading (4 different entities)
6. Form submission (3 different forms)
7. Delete confirmations
8. Import/export logic
9. Currency management
10. Formatting utilities

**Recommendation**:

Split into focused services:

```typescript
// 1. UI State Service (theme, sidebar, modals)
@Injectable({ providedIn: 'root' })
export class UiStateService {
  isDarkMode = signal(false);
  sidebarCollapsed = signal(false);
  activeModal = signal<ModalType | null>(null);

  toggleTheme() { }
  toggleSidebar() { }
  openModal(type: ModalType) { }
  closeModal() { }
}

// 2. Portfolio State Service (data management)
@Injectable({ providedIn: 'root' })
export class PortfolioStateService {
  securities = signal<Security[]>([]);
  dividendPayments = signal<DividendPayment[]>([]);
  securityTransactions = signal<SecurityTransaction[]>([]);

  // Computed values
  totalInvestment = computed(() => { });
  totalDividends = computed(() => { });

  loadAllData() { }
  refreshPrices() { }
}

// 3. Transaction Facade Service (form orchestration)
@Injectable({ providedIn: 'root' })
export class TransactionFacadeService {
  constructor(
    private dividendService: DividendPaymentService,
    private portfolioState: PortfolioStateService,
    private uiState: UiStateService,
    private toast: ToastService,
  ) {}

  submitDividend(form: TransactionForm) {
    // Coordinate between services
  }
}

// 4. Import/Export Service (already exists in DataService)
```

**Benefits**:
- Each service has one clear responsibility
- Easier to test (smaller units)
- Easier to understand and modify
- Better reusability

**Effort**: 12 hours (refactoring + testing)
**Priority**: P1 (High)
**Files to Create**:
- `apps/dividends/src/app/services/ui-state.service.ts`
- `apps/dividends/src/app/services/portfolio-state.service.ts`
- `apps/dividends/src/app/services/transaction-facade.service.ts`

**Migration Strategy**:
1. Create new services
2. Move functionality incrementally
3. Update components to use new services
4. Deprecate AppStateService methods
5. Remove AppStateService

---

### Issue 5: No Repository Pattern

**Status**: ✅ Implemented (GitHub issue #22). Every entity has a typed repository in its feature folder (`SecuritiesRepository`, `DividendPaymentsRepository`, `SecurityTransactionsRepository`, `CurrenciesRepository`, `ExchangeRatesRepository`, `SecurityPricesRepository`, plus `UsersRepository` and `DataImportRepository` for the transactional data import). The global `DatabaseModule` (`apps/api/src/app/database/database.module.ts`) provides a single `PrismaService` instance and all repositories; services no longer inject `PrismaService` (only the database health check still uses it). Instead of the generic base class with a string model name sketched below, the repositories expose explicit, type-safe, intention-revealing methods (e.g. `findBySymbol`, `findExistingCodes`, `search`), and service specs mock the repositories instead of Prisma.

The original recommendation is kept below for reference.

**Problem**:
- Services directly use Prisma
- Tight coupling to ORM
- Difficult to mock in tests
- Changing database access requires changes in many files

**Current Pattern**:
```typescript
@Injectable()
export class SecuritiesService {
  constructor(private prisma: PrismaService) {}

  async createSecurity(dto: CreateSecurityDto) {
    return this.prisma.security.create({ data: dto });
  }
}
```

**Recommendation**:

```typescript
// 1. Generic repository interface
export interface IRepository<T, CreateDto, UpdateDto> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(dto: CreateDto): Promise<T>;
  update(id: string, dto: UpdateDto): Promise<T>;
  delete(id: string): Promise<void>;
}

// 2. Prisma repository base class
export abstract class PrismaRepository<T, CreateDto, UpdateDto>
  implements IRepository<T, CreateDto, UpdateDto>
{
  constructor(
    protected prisma: PrismaService,
    protected model: string,
  ) {}

  async findAll(): Promise<T[]> {
    return this.prisma[this.model].findMany();
  }

  // ... other methods
}

// 3. Domain-specific repository
@Injectable()
export class SecuritiesRepository
  extends PrismaRepository<Security, CreateSecurityDto, UpdateSecurityDto>
{
  constructor(prisma: PrismaService) {
    super(prisma, 'security');
  }

  // Domain-specific queries
  async searchBySymbol(query: string): Promise<Security[]> {
    return this.prisma.security.findMany({
      where: {
        OR: [
          { symbol: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
    });
  }
}

// 4. Service uses repository
@Injectable()
export class SecuritiesService {
  constructor(
    private repository: SecuritiesRepository,
    private currenciesRepository: CurrenciesRepository,
  ) {}

  async createSecurity(dto: CreateSecurityDto): Promise<Security> {
    // Validate currency exists
    const currency = await this.currenciesRepository.findByCode(dto.currency);
    if (!currency) {
      throw new NotFoundException('Currency not found');
    }

    // Check duplicate
    const existing = await this.repository.findBySymbol(dto.symbol);
    if (existing) {
      throw new ConflictException('Symbol already exists');
    }

    return this.repository.create(dto);
  }
}
```

**Benefits**:
- Decouples business logic from data access
- Easy to mock repositories for testing
- Can swap ORM without touching services
- Reusable query logic
- Consistent API across repositories

**Effort**: 16 hours (for all entities)
**Priority**: P2 (Medium)
**Trade-off**: More code, more abstraction (may be overkill for small project)

---

### Issue 6: Limited Test Coverage

**Status**: ⚠️ Largely implemented — every API service and controller has a spec, there are three `*.integration.spec.ts` files (auth, securities, dividend payments) using `apps/api/src/testing/integration-test.helper.ts`, test data factories in `apps/api/src/testing/factories`, and frontend specs for state services, interceptors and selected components. `api-e2e` contains an end-to-end test for the securities endpoints (`securities.e2e.spec.ts`). No `coverageThreshold` is configured, so the coverage goal is not enforced.

**Problem**:
- Few unit tests
- No integration tests for critical flows
- No E2E tests for user journeys
- Difficult to refactor with confidence

**Current State**:
- ✅ Jest configured
- ✅ Some validator tests
- ❌ No service tests
- ❌ No controller tests
- ❌ No E2E tests

**Recommendation**:

**1. Unit Tests for Services**:
```typescript
describe('SecuritiesService', () => {
  let service: SecuritiesService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecuritiesService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaClient>(),
        },
      ],
    }).compile();

    service = module.get(SecuritiesService);
    prisma = module.get(PrismaService);
  });

  it('should create a security', async () => {
    const dto = { /* ... */ };
    prisma.security.create.mockResolvedValue(/* ... */);

    const result = await service.createSecurity(dto);

    expect(result).toBeDefined();
    expect(prisma.security.create).toHaveBeenCalledWith({ data: dto });
  });
});
```

**2. Integration Tests for API**:
```typescript
describe('SecuritiesController (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/securities (POST) should create security', () => {
    return request(app.getHttpServer())
      .post('/securities')
      .send({
        name: 'Apple Inc.',
        symbol: 'AAPL',
        type: 'STOCK',
        exchange: 'NASDAQ',
        currency: 'USD',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.symbol).toBe('AAPL');
      });
  });
});
```

**3. Test Data Factories**:
```typescript
// Test utilities
export class SecurityFactory {
  static create(overrides?: Partial<Security>): Security {
    return {
      id: faker.string.uuid(),
      name: faker.company.name(),
      symbol: faker.string.alpha(4).toUpperCase(),
      type: 'STOCK',
      exchange: 'NASDAQ',
      currency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }
}
```

**Coverage Goal**: 80% for services, 70% overall

**Effort**: 40 hours (comprehensive coverage)
**Priority**: P2 (Medium)
**Packages**: `jest-mock-extended`, `@faker-js/faker`, `supertest`

---

## 12.3 Extensibility Improvements

### Issue 7: Hardcoded Exchange Rate Provider

**Status**: ⚠️ Partial — The provider abstraction exists (#23): `ExchangeRatesService` uses the interface `ExchangeRateProvider` (`apps/api/src/app/exchange-rates/providers/exchange-rate-provider.ts`), injected via the token `EXCHANGE_RATE_PROVIDER`. The ECB logic (HTTP request, CSV parsing, error mapping) lives in `EcbExchangeRateProvider`, which `ExchangeRatesModule` registers as the only provider. Open: additional providers, provider selection (factory) and a fallback if the ECB is down.

**Problem**:
- ECB provider hardcoded in service
- Cannot easily add/switch providers
- Provider-specific logic (CSV parsing) in service
- No fallback if ECB is down

**Recommendation**:

```typescript
// 1. Provider interface
export interface IExchangeRateProvider {
  readonly name: string;
  fetchRates(
    baseCurrency: string,
    targetCurrency: string,
    from: Date,
    to: Date,
  ): Promise<ExchangeRateData[]>;
}

// 2. ECB provider implementation
@Injectable()
export class EcbProvider implements IExchangeRateProvider {
  readonly name = 'ecb';

  async fetchRates(/* ... */): Promise<ExchangeRateData[]> {
    // Current ECB logic
  }
}

// 3. Additional provider (e.g., Currency Layer)
@Injectable()
export class CurrencyLayerProvider implements IExchangeRateProvider {
  readonly name = 'currencylayer';

  async fetchRates(/* ... */): Promise<ExchangeRateData[]> {
    // Currency Layer API logic
  }
}

// 4. Provider factory
@Injectable()
export class ExchangeRateProviderFactory {
  constructor(
    private ecbProvider: EcbProvider,
    private currencyLayerProvider: CurrencyLayerProvider,
  ) {}

  getProvider(name: string): IExchangeRateProvider {
    switch (name) {
      case 'ecb':
        return this.ecbProvider;
      case 'currencylayer':
        return this.currencyLayerProvider;
      default:
        throw new Error(`Unknown provider: ${name}`);
    }
  }
}

// 5. Service uses strategy pattern
@Injectable()
export class ExchangeRatesService {
  constructor(
    private providerFactory: ExchangeRateProviderFactory,
    private prisma: PrismaService,
  ) {}

  async syncExchangeRates(
    targetCurrency: string,
    from?: Date,
    to?: Date,
    providerName: string = 'ecb',
  ) {
    const provider = this.providerFactory.getProvider(providerName);
    const rates = await provider.fetchRates('EUR', targetCurrency, from, to);

    // Store rates (provider-agnostic)
    // ...
  }
}
```

**Benefits**:
- Easy to add new providers
- Can configure provider per currency
- Fallback strategies possible
- Provider-specific logic isolated

**Effort**: 8 hours
**Priority**: P2 (Medium)

---

### Issue 8: Hardcoded EUR Base Currency

**Status**: ⚠️ Partial — `DEFAULT_CURRENCY` / `DEFAULT_CURRENCY_NAME` and `GET /api/currencies/default` exist. EUR is still hardcoded as base currency in `exchange-rates.service.ts` and in several frontend services and tables.

**Problem**:
- EUR hardcoded in multiple places
- Cannot change base currency
- ECB limitation propagates everywhere
- Frontend assumes EUR

**Locations**:
- `apps/api/src/app/exchange-rates/exchange-rates.service.ts:45` (`baseCurrency = 'EUR'`), also in `syncAllCurrencies` and `getLatestRatesToEur`
- `apps/dividends/src/app/services/transaction-facade.service.ts` (`destCurrency: 'EUR'`; `app-state.service.ts` no longer exists)
- `apps/dividends/src/app/services/dividend-data.service.ts`, `ui-state.service.ts`, table components (`currency: 'EUR'`)
- Database constraints assume EUR

**Recommendation**:

```typescript
// 1. Configuration service
@Injectable()
export class CurrencyConfigService {
  getBaseCurrency(): string {
    return process.env.BASE_CURRENCY || 'EUR';
  }

  getDefaultCurrency(): string {
    return process.env.DEFAULT_CURRENCY || 'EUR';
  }
}

// 2. Use in services
@Injectable()
export class DividendPaymentsService {
  constructor(
    private prisma: PrismaService,
    private currencyConfig: CurrencyConfigService,
  ) {}

  async createPayment(dto: CreateDividendPaymentDto) {
    const baseCurrency = this.currencyConfig.getBaseCurrency();
    // Use baseCurrency instead of 'EUR'
  }
}

// 3. Frontend retrieves from API
@Injectable()
export class CurrencyService {
  getDefaultCurrency(): Observable<Currency> {
    return this.http.get<Currency>('/api/currencies/default');
  }
}
```

**Benefits**:
- Configurable base currency
- Easier to support multi-currency bases in future
- Centralized configuration

**Effort**: 6 hours
**Priority**: P3 (Low - not critical for current use case)

---

### Issue 9: No Price Provider Abstraction

**Status**: ⚠️ Partial — The provider abstraction exists (#26): `SecurityPricesService` uses the interface `PriceProvider` (`apps/api/src/app/security-prices/providers/price-provider.ts`), injected via the token `PRICE_PROVIDER`. The Yahoo Finance logic lives in `YahooFinancePriceProvider`, which `SecurityPricesModule` registers as the only provider. Open: additional providers, provider selection (factory) and a fallback if Yahoo Finance fails.

**Problem**:
- Similar to exchange rate provider issue
- Yahoo Finance hardcoded
- No fallback if Yahoo changes/fails

**Recommendation**:

Same strategy pattern as exchange rate providers:

```typescript
export interface IPriceProvider {
  readonly name: string;
  fetchPrices(
    symbol: string,
    from: Date,
    to: Date,
  ): Promise<SecurityPriceData[]>;
}

@Injectable()
export class YahooFinanceProvider implements IPriceProvider {
  readonly name = 'yahoo';
  // Current implementation
}

@Injectable()
export class AlphaVantageProvider implements IPriceProvider {
  readonly name = 'alphavantage';
  // Alternative provider
}
```

**Effort**: 6 hours
**Priority**: P3 (Low)

---

## 12.4 Performance & Scalability

### Issue 10: No Pagination

**Status**: ❌ Open on the API — list endpoints still return all records. The frontend paginates client-side only (`pagination-state.service.ts`).

**Problem**:
- All list endpoints return all records
- Frontend loads entire dataset
- Will not scale beyond ~1000 records per entity

**Affected Endpoints**:
- `GET /api/securities`
- `GET /api/dividend-payments`
- `GET /api/security-transactions`
- `GET /api/currencies`

**Recommendation**:

```typescript
// 1. Pagination DTO
export class PaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;
}

// 2. Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 3. Service method
async findAllPaginated(
  pagination: PaginationDto,
): Promise<PaginatedResponse<Security>> {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    this.prisma.security.findMany({
      skip,
      take: limit,
      orderBy: { symbol: 'asc' },
    }),
    this.prisma.security.count(),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// 4. Controller
@Get()
async findAll(@Query() pagination: PaginationDto) {
  return this.service.findAllPaginated(pagination);
}
```

**Frontend**:
```typescript
// Virtual scrolling or pagination component
<cdk-virtual-scroll-viewport itemSize="50">
  <div *cdkVirtualFor="let item of items">
    {{ item.name }}
  </div>
</cdk-virtual-scroll-viewport>
```

**Effort**: 8 hours (all endpoints)
**Priority**: P2 (Medium - important for scalability)

---

### Issue 11: No Caching Strategy

**Status**: ❌ Open.

**Problem**:
- Currencies queried on every request
- Exchange rates queried repeatedly
- No cache headers
- Database hit for static data

**Recommendation**:

```typescript
// 1. Install cache-manager
npm install @nestjs/cache-manager cache-manager

// 2. Configure caching module
@Module({
  imports: [
    CacheModule.register({
      ttl: 300, // 5 minutes default
      max: 100, // max items
    }),
  ],
})
export class AppModule {}

// 3. Use cache interceptor
@Controller('currencies')
@UseInterceptors(CacheInterceptor)
export class CurrenciesController {
  @Get()
  @CacheTTL(3600) // Cache for 1 hour
  async findAll() {
    return this.service.findAll();
  }
}

// 4. Manual cache management
@Injectable()
export class CurrenciesService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(dto: CreateCurrencyDto) {
    const currency = await this.prisma.currency.create({ data: dto });

    // Invalidate cache
    await this.cacheManager.del('currencies-all');

    return currency;
  }
}
```

**Effort**: 4 hours
**Priority**: P3 (Low - optimization)
**Package**: `@nestjs/cache-manager`

---

## 12.5 Code Quality & Standards

### Issue 12: Inconsistent Error Messages

**Status**: ❌ Open — backend messages are English, frontend messages German. Additionally, registration with an existing email returns `401 Unauthorized` instead of `409 Conflict` (`apps/api/src/app/auth/auth.service.ts`, `register()`).

**Problem**:
- Error messages in English and German mixed
- No i18n strategy
- Some technical error details exposed to users

**Recommendation**:

```typescript
// 1. Error message constants
export const ErrorMessages = {
  SECURITY_NOT_FOUND: 'Das Wertpapier wurde nicht gefunden',
  SECURITY_DUPLICATE_SYMBOL: 'Ein Wertpapier mit diesem Symbol existiert bereits',
  CURRENCY_NOT_FOUND: 'Die Währung wurde nicht gefunden',
  CURRENCY_INVALID_CODE: 'Der Währungscode muss ein gültiger ISO 4217 Code sein',
  // ...
} as const;

// 2. Use in services
throw new NotFoundException(ErrorMessages.SECURITY_NOT_FOUND);

// 3. Future: i18n support
import { I18nService } from 'nestjs-i18n';

throw new NotFoundException(
  this.i18n.translate('errors.SECURITY_NOT_FOUND', { lang: 'de' })
);
```

**Effort**: 4 hours
**Priority**: P3 (Low)

---

### Issue 13: No Request Logging

**Status**: ✅ Implemented — `RequestLoggingMiddleware` (`apps/api/src/app/common/middleware/request-logging.middleware.ts`), registered for all routes in `AppModule.configure()`. It logs one structured entry per request (`method`, `url`, `statusCode`, `durationMs`, logger context `HTTP`) once the response is sent. Deviations from the recommendation below: IP address and user agent are not logged (personal data), and the health checks (`/api/health`, `/api/health/db`) are excluded. Response compression is still not enabled.

**Problem**:
- No access logs
- No request/response logging
- Difficult to debug issues
- No performance monitoring

**Recommendation**:

```typescript
// Logging middleware
@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;

      this.logger.log({
        method,
        url: originalUrl,
        statusCode,
        duration: `${duration}ms`,
        ip,
        userAgent,
      });
    });

    next();
  }
}

// Register middleware
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
```

**Effort**: 2 hours
**Priority**: P2 (Medium)

---

## 12.6 Implementation Roadmap

### Phase 1: Security & Stability (Week 1-2)

**Priority**: P0 - Critical

1. ⚠️ Add authentication & authorization (24h) — authentication done, authorization open
2. ✅ Add centralized error handling (8h)
3. ⚠️ Add health checks (4h) — database done, external providers open
4. ✅ Add request logging (2h)

**Total**: ~38 hours

---

### Phase 2: Maintainability (Week 3-4)

**Priority**: P1 - High

1. ✅ Refactor AppStateService (12h)
2. ⚠️ Add unit tests (40h - spread over time) — largely done, no coverage threshold
3. ❌ Add pagination (8h) — client-side only

**Total**: ~60 hours

---

### Phase 3: Extensibility (Week 5-6)

**Priority**: P2 - Medium

1. ✅ Add repository pattern (16h) — done
2. ❌ Add provider abstraction for exchange rates (8h)
3. ❌ Add provider abstraction for prices (6h)

**Total**: ~30 hours

---

### Phase 4: Polish & Optimization (Week 7-8)

**Priority**: P3 - Low

1. ❌ Add caching (4h)
2. ❌ Standardize error messages (4h)
3. ⚠️ Make base currency configurable (6h) — default currency configurable, EUR base still hardcoded
4. ❌ Add response compression (1h)

**Total**: ~15 hours

---

## 12.7 Summary

### Quick Wins (< 4 hours each)

1. Add health checks ⚠️ (database done, external providers open)
2. Add request logging ✅
3. Add caching for currencies ❌
4. Add response compression ❌
5. Standardize error messages ❌

### High-Impact Changes

1. **Authentication** (P0) - Enables multi-user, security — ✅ done; authorization/data ownership open
2. **Error handling** (P0) - Better debugging, UX — ✅ done
3. **Refactor AppStateService** (P1) - Maintainability — ✅ done
4. **Add tests** (P1) - Confidence in refactoring — ⚠️ largely done
5. **Pagination** (P2) - Scalability — ❌ open

### Architecture Evolution

```
Current State:
- Frontend state split into focused services (largest: TransactionFacadeService)
- Repository pattern (services do not use Prisma directly)
- Hardcoded providers
- No provider abstractions

Recommended State:
- Focused, single-responsibility services
- Repository pattern
- Provider abstractions (strategy pattern)
- Clear separation of concerns
```

### Metrics for Success

| Metric | Current | Target |
|--------|---------|--------|
| **Test Coverage** | Not measured (no `coverageThreshold` configured) | 80% |
| **Avg Service Size** | Not re-measured | <100 lines |
| **Largest Service** | ~585 lines (`transaction-facade.service.ts`) | <200 lines |
| **Authentication** | JWT (no authorization/data ownership) | JWT + authorization |
| **Error Handling** | Centralized (exception filter + interceptor) | Centralized |
| **Caching** | None | Strategic |
| **Pagination** | Client-side only (frontend) | All lists |

---

**Document Version**: 1.0
**Last Updated**: 2026-11-17
**Authors**: Architecture Review Team
