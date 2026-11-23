# 8. Cross-Cutting Concepts

## 8.1 Validation Strategy

### Multi-Layer Validation

The application implements defense-in-depth validation across three layers:

#### Layer 1: Client-Side (Angular)

**Purpose**: Immediate user feedback, better UX

**Implementation**:
- Signal Forms (`@angular/forms/signals`) in all forms: the form model is a `signal`, `form()` adds a validation schema, inputs are bound with `[formField]`, submission runs through `[formRoot]` / `submit()`
- Built-in validators (`required`, `email`, `minLength`, `maxLength`, `pattern`) and custom rules via `validate()`
- Messages are shown below the field by `FieldErrorsComponent` (`shared/inputs/field-errors/`) once the field was left or the form was submitted; an invalid form is not submitted
- `DecimalInputComponent` (`shared/inputs/decimal-input/`) is a custom form control that accepts a comma as decimal separator and reports invalid numbers as a parse error

**Example** (Currency Modal):
```typescript
// currency-modal.component.ts
readonly currencyForm = form(this.formData, (path) => {
  required(path.code, { message: 'Bitte geben Sie einen ISO-Code ein (z.B. CHF, SEK, JPY)' });
  maxLength(path.code, 3);
  pattern(path.code, /^[A-Za-z]{3}$/, { message: 'ISO-Code muss aus genau 3 Buchstaben bestehen (z.B. CHF, SEK, JPY)' });
  validate(path.name, ({ value }) => value().trim() ? undefined : { kind: 'required', message: '...' });
}, { submission: { action: async () => { /* emit and reset */ } } });
```

**Limitation**: Can be bypassed by users (not security-critical)

#### Layer 2: Server-Side (NestJS DTOs)

**Purpose**: Security, data integrity

**Implementation**:
- class-validator decorators on DTOs
- Global ValidationPipe in main.ts
- Custom validators for domain-specific rules

**Example** (CreateCurrencyDto):
```typescript
@IsString()
@Length(3, 3)
@Matches(/^[A-Za-z]{3}$/)
@Transform(({ value }) => value?.toUpperCase().trim())
@IsISO4217Code()  // Custom validator
code: string;
```

**Benefits**:
- Cannot be bypassed
- Automatic transformation (uppercase, trim)
- Consistent error responses

#### Layer 3: Database Constraints

**Purpose**: Last line of defense, data integrity

**Implementation**:
- Unique constraints
- Foreign key constraints
- NOT NULL constraints
- Check constraints (via Prisma)

**Example** (Schema):
```prisma
model Currency {
  code String @unique
}
```

### Validation Patterns by Feature

| Feature | Client Validation | Server Validation | DB Constraints |
|---------|------------------|-------------------|----------------|
| **Currencies** | Length, format | ISO 4217 whitelist | Unique code |
| **Securities** | Required fields | Symbol format, currency exists | Unique symbol |
| **Dividends** | Date ranges, amounts | Security exists, positive amounts | Foreign keys |
| **Transactions** | Date, type, amounts | Security exists, type enum | Foreign keys, type enum |

## 8.2 Error Handling

### Current Implementation

#### Backend Error Handling

**HTTP Exceptions**:
- `NotFoundException`: Resource not found (404)
- `ConflictException`: Duplicate resource (409)
- `BadRequestException`: Invalid input (400)

**Example**:
```typescript
if (!security) {
  throw new NotFoundException('Security not found');
}
```

**Global Exception Filter** (`apps/api/src/app/common/filters/global-exception.filter.ts`, registered in `main.ts` via `app.useGlobalFilters`):
- Catches all exceptions (`@Catch()`)
- Returns a consistent response format: `statusCode`, `message`, `error`, `correlationId`, `timestamp`, `path`
- Generates a `correlationId` (UUID) per error response and includes it in the log entry
- Logs 5xx as errors (with stack trace) and 4xx as warnings, including the user ID if authenticated
- Hides messages of non-HTTP errors when `NODE_ENV=production`

**Limitations**:
- ❌ No error tracking/monitoring (e.g. external error aggregation)

#### Frontend Error Handling

**HTTP Error Interceptor** (`apps/dividends/src/app/interceptors/error.interceptor.ts`, functional `HttpInterceptorFn`):
- Extracts the message from the API error response (including array messages)
- Shows a toast, appending the first 8 characters of the `correlationId` if present
- Deduplicates identical toasts within a 1-second window
- On `401`: shows a session-expired message, logs out and redirects to `/login` with `returnUrl`
- Re-throws the error so components can still react to it

**Limitations**:
- ❌ Limited error recovery (no retry)
- ❌ No offline detection

### Implemented Pattern

#### 1. Centralized Exception Filter (Backend)

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const correlationId = randomUUID();
    // Map HttpException / Error to status, message, error
    // Log with correlationId (error for 5xx, warn for 4xx)
    // Respond with { statusCode, message, error, correlationId, timestamp, path }
  }
}
```

#### 2. HTTP Interceptor (Frontend)

```typescript
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Extract message + correlationId, handle 401, show deduplicated toast
      return throwError(() => error);
    })
  );
};
```

## 8.3 Logging Strategy

### Current Implementation

**Backend**:
- NestJS Logger used in some services and in the global exception filter
- Manual `console.log`/`console.error` still used in some places (e.g. `securities.service.ts`, `security-transactions.service.ts`)
- Inconsistent logging levels

**Example**:
```typescript
this.logger.log('Syncing exchange rates');
this.logger.warn('No rates found');
this.logger.error('Sync failed');
```

**Limitations**:
- ❌ No structured logging
- ❌ No log aggregation
- ⚠️ Correlation IDs only per error response (generated in the exception filter), no per-request IDs
- ❌ No request/access logging
- ❌ Inconsistent usage across modules

### Recommended Improvements

**1. Structured Logging**:
```typescript
this.logger.log({
  action: 'sync_exchange_rates',
  currency: 'USD',
  startDate,
  endDate,
  duration: elapsed
});
```

**2. Log Levels**:
- **DEBUG**: Development debugging
- **INFO**: Normal operations
- **WARN**: Degraded state, recoverable errors
- **ERROR**: Errors requiring attention

**3. Correlation**:
- Add request IDs to track operations across services
- Include user context where applicable

## 8.4 Configuration Management

### Current Implementation

**Environment Variables**:
- `DATABASE_URL`: PostgreSQL connection
- `PORT`: API server port (default `3000`)
- `DEFAULT_CURRENCY` / `DEFAULT_CURRENCY_NAME`: Default currency (served via `GET /api/currencies/default`)
- `SECURITY_PRICE_HISTORY_START`: Default sync start date
- `JWT_SECRET`: Secret for signing JWTs
- `ALLOW_REGISTRATION`: Enables self-registration via `POST /api/auth/register` (default: disabled)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`: Initial user created by the database seed
- `SEED_SAMPLE_DATA`: Lets the database seed create sample securities, transactions and dividends (default: disabled)

See `.env.example` in the project root.

**Startup Validation**:
- `EnvironmentVariables` in `apps/api/src/app/config/environment.validation.ts` describes the API's variables with `class-validator` rules; `validateEnvironment()` applies the defaults and throws an error that lists every invalid variable, without its value (values such as `DATABASE_URL` may contain credentials)
- Rules: `DATABASE_URL` required, `postgresql://` or `postgres://` URL; `JWT_SECRET` required, not empty; `PORT` integer 1–65535 (default `3000`); `DEFAULT_CURRENCY` three uppercase letters (default `EUR`); `SECURITY_PRICE_HISTORY_START` valid date `YYYY-MM-DD` (default `2017-01-01`); `ALLOW_REGISTRATION` `true`/`false`, case-insensitive (default `false`); `NODE_ENV` optional, `development`, `production` or `test`. Empty values count as not set
- `apps/api/src/app/config/environment.ts` runs the validation when it is loaded; it is the first import of `app.module.ts`, so the API aborts before other modules read variables at import time (e.g. `AuthModule` with `JWT_SECRET`)
- `ConfigModule.forRoot()` (`@nestjs/config`, global, `ignoreEnvFile: true`) receives the validated result. `.env` files are loaded by Nx (`nx serve`) and Docker Compose, not by the API itself
- The seed (`apps/api/prisma/seed.ts`) checks its own variables (`ADMIN_*`, `DEFAULT_CURRENCY_NAME`, `SEED_SAMPLE_DATA`) separately

**Limitations**:
- ❌ Services still read variables directly via `process.env` instead of a typed `ConfigService`
- ❌ Hardcoded values in code (e.g., EUR base currency in `exchange-rates.service.ts`)

### Recommended Improvements

**1. Typed Configuration Access**: Replace the `process.env` reads in the API with `ConfigService<EnvironmentVariables, true>`.

**2. Environment-Specific Configs**:
- `.env.development`
- `.env.production`
- `.env.test`

## 8.5 Data Transformation

### Currency Conversion Pattern

**Immutable Conversion**:
- Exchange rate stored with each transaction
- Allows historical accuracy
- Prevents retroactive changes

**Example** (Dividend Payment):
```typescript
{
  originCurrency: 'USD',
  destCurrency: 'EUR',
  conversionRate: 1.0842,  // Rate at time of payment
  finalPayment: 108.42     // Calculated once, stored
}
```

**Benefits**:
- Historical accuracy
- Audit trail
- No recalculation needed

### DTO Transformation

**Automatic Transformation**:
```typescript
@Transform(({ value }) => value?.toUpperCase().trim())
code: string;
```

**Benefits**:
- Data consistency
- Defensive programming
- User convenience

## 8.6 Security Concepts

### Current Implementation

**SQL Injection Prevention**:
- ✅ Prisma ORM with parameterized queries
- ✅ Raw SQL only via Prisma `$queryRaw` tagged templates (parameterized), e.g. in `security-prices.repository.ts`, `exchange-rates.repository.ts` and the health indicator (`health/prisma.health.ts`); no `$queryRawUnsafe`

**XSS Prevention**:
- ✅ Angular automatic escaping
- ✅ No `innerHTML` / `bypassSecurityTrust*` usage in application code

**CSRF Prevention**:
- ⚠️ No explicit CSRF protection; the risk is reduced because the JWT is stored in `localStorage` and sent as `Authorization: Bearer` header by the functional `authInterceptor` (no cookie-based session)

**Input Validation**:
- ✅ Multi-layer validation

**Authentication/Authorization**:
- ✅ JWT authentication (`apps/api/src/app/auth/`, Passport local + JWT strategies)
- ✅ `JwtAuthGuard` on all domain controllers (health endpoints are public)
- ✅ Self-registration disabled by default (`ALLOW_REGISTRATION`)
- ❌ No role-based authorization
- ❌ No per-user data ownership (single-user mode: every account can access all data)

### Recommended Security Improvements

**Priority 1 (Critical)**:
1. ~~**Add Authentication**~~: Implemented (JWT)
2. **Add Authorization**: Role-based access control / per-user data ownership (open)
3. **Rate Limiting**: Prevent abuse, especially on `/api/auth/login` (open)
4. **CORS Configuration**: Restrict origins (not configured)

**Priority 2 (High)**:
1. **Request Size Limits**: Configured in `main.ts` (200MB for JSON and urlencoded - possibly too high)
2. **Helmet.js**: Security headers
3. **HTTPS Enforcement**: In production
4. **Secrets Management**: Vault or env encryption

**Priority 3 (Medium)**:
1. **Audit Logging**: Track all modifications
2. **Input Sanitization**: Additional layer
3. **CSP Headers**: Content Security Policy

## 8.7 Testing Strategy

### Current Implementation

**Backend**:
- Jest configured
- Unit tests for services, controllers, validators, auth strategies, the exception filter and health checks
- Integration tests (`*.integration.spec.ts`) for auth, securities and dividend payments, using `apps/api/src/testing/integration-test.helper.ts`
- Test data factories in `apps/api/src/testing/factories` (`@faker-js/faker`)
- `api-e2e` project with an end-to-end test for the securities endpoints (`securities.e2e.spec.ts`): runs the full `AppModule` in-process against a dedicated PostgreSQL database (`<db>_e2e`, created and migrated in `support/global-setup.ts`), logs in via `POST /api/auth/login` and stubs the external price sync. Run with `nx e2e api-e2e`.

**Frontend**:
- Vitest via the Angular `@angular/build:unit-test` builder (`test` target in `apps/dividends/project.json`, jsdom environment, `isolate: true`); the builder initializes the Angular TestBed (zoneless), so there is no separate test setup file
- `fakeAsync`/`tick` are not used; timer-based tests use Vitest fake timers (`vi.useFakeTimers()`, `vi.advanceTimersByTime()`)
- Unit tests for state services, the facade, interceptors and selected components

**Limitations**:
- ⚠️ No coverage thresholds (`coverageThreshold`) enforced
- ❌ No API contract tests
- ❌ No E2E tests for UI

### Recommended Testing Strategy

**Unit Tests** (Target: 80% coverage):
- Services: Business logic
- Validators: Custom validation rules
- Utilities: Helper functions

**Integration Tests**:
- API endpoints with real database
- Service → Prisma integration

**E2E Tests**:
- Critical user flows (create dividend, export data)
- API tests via Supertest

**Contract Tests**:
- OpenAPI schema validation
- Ensure frontend/backend compatibility

## 8.8 Performance Considerations

### Current Optimizations

**Database**:
- ✅ Composite indexes on common query patterns
- ✅ Connection pooling (Prisma default)
- ✅ Selective field retrieval where needed

**Frontend**:
- ✅ Lazy-loaded routes
- ✅ Signal-based reactivity (efficient change detection)
- ✅ Zoneless change detection (no Zone.js); all components use `ChangeDetectionStrategy.OnPush`

**API**:
- ⚠️ No caching
- ⚠️ No pagination (except implicit TAKE 10 in search); the frontend paginates client-side only
- ⚠️ Large payload support (200MB limit)

### Recommended Improvements

**1. Caching**:
```typescript
// Cache frequently accessed data
@CacheTTL(300) // 5 minutes
async getCurrencies() {
  return this.currenciesRepository.findAll();
}
```

**2. Pagination**:
```typescript
// Paginate large lists
async getDividends(page: number, limit: number) {
  // e.g. a new repository method wrapping findMany({ skip, take, orderBy })
  return this.dividendPaymentsRepository.findPage(page, limit);
}
```

**3. Response Compression**:
```typescript
// Enable gzip compression
app.use(compression());
```

**4. Database Query Optimization**:
- Add indexes for new query patterns
- Use `select` to limit returned fields
- Avoid N+1 queries with `include`
