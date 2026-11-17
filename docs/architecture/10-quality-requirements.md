# 10. Quality Requirements

## 10.1 Quality Tree

```
Quality
├── Maintainability (Priority: 1)
│   ├── Modularity
│   ├── Testability
│   ├── Analyzability
│   └── Modifiability
│
├── Reliability (Priority: 2)
│   ├── Data Integrity
│   ├── Fault Tolerance
│   └── Recoverability
│
├── Security (Priority: 3)
│   ├── Authentication
│   ├── Authorization
│   └── Data Protection
│
├── Performance (Priority: 4)
│   ├── Response Time
│   ├── Resource Utilization
│   └── Scalability
│
└── Usability (Priority: 5)
    ├── User Interface
    ├── Accessibility
    └── Internationalization
```

## 10.2 Quality Scenarios

### Maintainability Scenarios

#### M1: Adding a New Asset Type

**Scenario**: Developer needs to add support for "CRYPTO" as a new security type

**Current State**:
1. Add `CRYPTO` to SecurityType enum in Prisma schema
2. Run migration: `prisma migrate dev`
3. Update shared types (automatically via Prisma generation)
4. Update frontend dropdowns

**Challenges**:
- ✅ Easy enum extension
- ✅ Type safety enforced
- ⚠️ No specific business logic abstraction per type

**Effort**: ~1 hour

**Assessment**: ✅ Good modularity

#### M2: Adding a New Currency Provider

**Scenario**: Replace or supplement ECB with another exchange rate provider

**Current State**:
- ExchangeRatesService hardcoded to ECB
- CSV parsing specific to ECB format

**Challenges**:
- ❌ No provider abstraction
- ❌ Single provider hardcoded
- ❌ No strategy pattern

**Effort**: ~8 hours (refactoring required)

**Assessment**: ❌ Poor extensibility

**Recommendation**:
```typescript
interface ExchangeRateProvider {
  fetchRates(currency: string, from: Date, to: Date): Promise<Rate[]>;
}

class EcbProvider implements ExchangeRateProvider { }
class CurrencyLayerProvider implements ExchangeRateProvider { }
```

#### M3: Adding Unit Tests for a Service

**Scenario**: Developer needs to add comprehensive tests for DividendPaymentsService

**Current State**:
- Jest configured, `jest-mock-extended` available for mocking Prisma
- Service specs exist for the API services, plus integration tests (`*.integration.spec.ts`) for auth, securities and dividend payments
- Test data factories in `apps/api/src/testing/factories` (currency, security, dividend payment, user)
- `apps/api/src/testing/integration-test.helper.ts` creates a test application for integration tests
- Service uses Prisma directly

**Challenges**:
- ⚠️ Mocking Prisma still requires per-test setup (no repository abstraction)
- ⚠️ No coverage thresholds enforced

**Effort**: ~1-2 hours (infrastructure already in place)

**Assessment**: ✅ Good testability

**Recommendation**: Enforce coverage thresholds in Jest configuration

### Reliability Scenarios

#### R1: Database Connection Failure

**Scenario**: PostgreSQL database becomes unavailable

**Current Behavior**:
- Prisma throws connection error
- API returns 500 errors (consistent format via global exception filter)
- Health endpoints `GET /api/health` and `GET /api/health/db` (`@nestjs/terminus`, `SELECT 1` ping) report the database status
- No retry logic
- No circuit breaker
- No degraded mode

**Impact**: ❌ Total service failure (but detectable via health check)

**Recommendation**:
1. ~~Health check endpoint~~ (implemented for the database; ECB/Yahoo checks open)
2. Connection retry with exponential backoff
3. Graceful degradation where possible
4. User-friendly error messages

#### R2: External API Failure (Yahoo Finance)

**Scenario**: Yahoo Finance API is down or rate-limiting

**Current Behavior**:
- Request times out after 30s
- Error logged
- Sync fails for that security
- No retry logic

**Impact**: ⚠️ Partial data staleness

**Assessment**: ⚠️ Acceptable (not critical path)

**Recommendation**:
1. Add retry with exponential backoff
2. Fallback to alternative provider
3. Queue failed requests for later

#### R3: Data Corruption During Import

**Scenario**: User imports malformed JSON file

**Current Behavior**:
- Validation on DTOs
- JSON import (`DataService.importAllData`) runs entirely inside `prisma.$transaction` and is rolled back on any error
- CSV imports (`importFromCsv` in securities and dividend payments services) do not use a transaction and may import partially

**Impact**: ✅ JSON import atomic; ⚠️ CSV imports may leave partial state

**Assessment**: ⚠️ Partially addressed

**Recommendation**:
1. Validate entire file before import
2. Wrap CSV imports in a transaction as well
3. Return detailed error report

### Security Scenarios

#### S1: Unauthorized Access Attempt

**Scenario**: Attacker tries to access API endpoints

**Current Behavior**:
- ✅ JWT authentication (`apps/api/src/app/auth/`)
- ✅ `JwtAuthGuard` on all domain controllers (health endpoints are public)
- ✅ Self-registration disabled by default (`ALLOW_REGISTRATION`)
- ❌ No per-user data ownership (any authenticated account can access all data)
- ❌ No rate limiting (including login endpoint)
- ❌ No request logging

**Impact**: ✅ Unauthenticated access blocked; ⚠️ brute-force attempts on login not throttled

**Recommendation**:
1. ~~Implement JWT authentication~~ (done)
2. ~~Add guards to all endpoints~~ (done)
3. Add rate limiting (e.g., 100 requests/minute, stricter on login)
4. Add request audit logging

#### S2: SQL Injection Attempt

**Scenario**: Attacker submits malicious input

**Current Behavior**:
- ✅ Prisma uses parameterized queries
- ✅ Raw SQL only via `$queryRaw` tagged templates (parameterized), no `$queryRawUnsafe`
- ✅ Input validation

**Impact**: ✅ Protected

**Assessment**: ✅ Good

#### S3: XSS Attack Attempt

**Scenario**: Attacker tries to inject script in form inputs

**Current Behavior**:
- ✅ Angular auto-escaping
- ✅ No `innerHTML` / `bypassSecurityTrust*` usage in application code
- ✅ Input validation

**Impact**: ✅ Mitigated

**Assessment**: ✅ Good

### Performance Scenarios

#### P1: Loading Dashboard with 1000+ Dividend Payments

**Scenario**: User has 1000+ dividend records

**Current Behavior**:
- Loads all dividends in one request
- Frontend filters in memory
- No pagination
- No virtual scrolling

**Impact**: ⚠️ Slow initial load, high memory usage

**Assessment**: ⚠️ Needs improvement for scale

**Recommendation**:
1. Add pagination to API
2. Implement virtual scrolling on frontend
3. Cache KPI calculations

#### P2: Syncing 10 Years of Price History

**Scenario**: User syncs price data for 50 securities over 10 years

**Current Behavior**:
- Sequential processing
- 500-row batch inserts
- No progress indicator
- Manual sync (`POST /api/security-prices/sync`) runs synchronously within the request
- Daily incremental update runs as cron job at 07:00 (`price-update-scheduler.service.ts`, `@Cron('0 0 7 * * *')`)

**Impact**: ⚠️ Long-running request (minutes) for manual sync

**Assessment**: ⚠️ Functional but not optimal

**Recommendation**:
1. Background job processing for manual syncs
2. WebSocket or SSE for progress updates
3. Parallel processing where safe

#### P3: Calculating Portfolio Performance

**Scenario**: User views portfolio page with 50 securities

**Current Behavior**:
- Loads all securities
- Loads latest price for each
- Calculates on frontend
- Uses computed signals (efficient)

**Impact**: ✅ Fast enough for current scale

**Assessment**: ✅ Acceptable, consider caching at larger scale

### Usability Scenarios

#### U1: User Adds a Dividend Payment

**Scenario**: User wants to record a dividend from Apple

**Current Behavior**:
1. Click "Neu" → "Neue Dividende"
2. Search for security (autocomplete)
3. Fill in dates, amount, currency, tax
4. Form auto-calculates final payment
5. Submit → toast notification → modal closes

**Assessment**: ✅ Excellent UX

**Strengths**:
- Auto-calculation
- Autocomplete search
- Immediate feedback
- Clear error messages

#### U2: User Discovers Validation Error

**Scenario**: User tries to add invalid currency code

**Current Behavior**:
1. Client validation shows inline error
2. If bypassed, server returns structured error
3. Toast notification shows error
4. Form stays open for correction

**Assessment**: ✅ Good error handling

#### U3: User Wants to Export Data

**Scenario**: User wants to backup all data

**Current Behavior**:
1. Click menu → "Daten exportieren"
2. JSON file downloads immediately
3. Filename includes timestamp

**Assessment**: ✅ Simple and effective

## 10.3 Quality Attribute Assessment

### Current Quality Scores (1-5 scale)

| Quality Attribute | Score | Justification |
|------------------|-------|---------------|
| **Modularity** | 4/5 | Good module separation, some services too large |
| **Testability** | 3/5 | Unit, integration tests and factories exist; no coverage thresholds, direct Prisma coupling |
| **Analyzability** | 4/5 | Clean code, TypeScript, some missing docs |
| **Modifiability** | 3/5 | Easy for simple changes, harder for architectural changes |
| **Data Integrity** | 4/5 | Good validation, JSON import transactional, CSV imports not |
| **Fault Tolerance** | 2/5 | Retry with backoff only for Yahoo rate limits; no circuit breakers |
| **Recoverability** | 3/5 | Export/import available, no automated backups |
| **Authentication** | 4/5 | JWT, guards on all domain controllers; no rate limiting on login |
| **Authorization** | 2/5 | Authenticated access only; no roles, no per-user data ownership |
| **Data Protection** | 3/5 | Self-hosted (good), no encryption at rest |
| **Response Time** | 4/5 | Fast for current scale, no pagination |
| **Resource Utilization** | 4/5 | Efficient, no major leaks |
| **Scalability** | 3/5 | Good for single-user, limited for multi-user |
| **User Interface** | 4/5 | Clean, modern, responsive |
| **Accessibility** | 2/5 | Basic accessibility, not comprehensive |
| **i18n** | 1/5 | German only, no i18n framework |

### Priority Improvements

**Critical (Security)**:
1. ~~Add authentication~~ (done); add authorization / per-user data ownership
2. Add rate limiting
3. Add audit logging

**High (Reliability)**:
1. ~~Add centralized error handling~~ (done)
2. ~~Add health checks~~ (done for the database); add checks for ECB/Yahoo
3. Improve transaction management (CSV imports)

**Medium (Maintainability)**:
1. ~~Refactor AppStateService~~ (done); `TransactionFacadeService` (~585 lines) is now the largest service
2. Add repository pattern abstraction
3. Enforce coverage thresholds (target 80%)

**Low (Performance)**:
1. Add pagination
2. Add caching layer
3. Add response compression
