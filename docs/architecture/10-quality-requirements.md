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
- Jest configured
- No existing tests for this service
- Service uses Prisma directly

**Challenges**:
- ⚠️ Mocking Prisma requires setup
- ❌ No test database utilities
- ❌ No test data factories

**Effort**: ~4 hours (including setup)

**Assessment**: ⚠️ Moderate difficulty

**Recommendation**: Add test utilities and factories

### Reliability Scenarios

#### R1: Database Connection Failure

**Scenario**: PostgreSQL database becomes unavailable

**Current Behavior**:
- Prisma throws connection error
- API returns 500 errors
- No retry logic
- No circuit breaker
- No degraded mode

**Impact**: ❌ Total service failure

**Recommendation**:
1. Health check endpoint
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
- Transaction support in DataService
- May partially import before failure

**Impact**: ⚠️ Inconsistent state possible

**Assessment**: ⚠️ Needs improvement

**Recommendation**:
1. Validate entire file before import
2. Wrap entire import in transaction
3. Rollback on any error
4. Return detailed error report

### Security Scenarios

#### S1: Unauthorized Access Attempt

**Scenario**: Attacker tries to access API endpoints

**Current Behavior**:
- ❌ **CRITICAL**: No authentication
- ❌ **CRITICAL**: All endpoints open
- ❌ No rate limiting
- ❌ No request logging

**Impact**: ❌ **CRITICAL** - Full data access

**Recommendation** (HIGH PRIORITY):
1. Implement JWT authentication
2. Add guards to all endpoints
3. Add rate limiting (e.g., 100 requests/minute)
4. Add request audit logging

#### S2: SQL Injection Attempt

**Scenario**: Attacker submits malicious input

**Current Behavior**:
- ✅ Prisma uses parameterized queries
- ✅ No raw SQL
- ✅ Input validation

**Impact**: ✅ Protected

**Assessment**: ✅ Good

#### S3: XSS Attack Attempt

**Scenario**: Attacker tries to inject script in form inputs

**Current Behavior**:
- ✅ Angular auto-escaping
- ✅ No innerHTML usage (assumed)
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
- No background processing

**Impact**: ⚠️ Long-running request (minutes)

**Assessment**: ⚠️ Functional but not optimal

**Recommendation**:
1. Background job processing
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
| **Testability** | 2/5 | Limited tests, some tight coupling |
| **Analyzability** | 4/5 | Clean code, TypeScript, some missing docs |
| **Modifiability** | 3/5 | Easy for simple changes, harder for architectural changes |
| **Data Integrity** | 4/5 | Good validation, limited transactions |
| **Fault Tolerance** | 2/5 | No retry logic, no circuit breakers |
| **Recoverability** | 3/5 | Export/import available, no automated backups |
| **Authentication** | 1/5 | ❌ Not implemented |
| **Authorization** | 1/5 | ❌ Not implemented |
| **Data Protection** | 3/5 | Self-hosted (good), no encryption at rest |
| **Response Time** | 4/5 | Fast for current scale, no pagination |
| **Resource Utilization** | 4/5 | Efficient, no major leaks |
| **Scalability** | 3/5 | Good for single-user, limited for multi-user |
| **User Interface** | 4/5 | Clean, modern, responsive |
| **Accessibility** | 2/5 | Basic accessibility, not comprehensive |
| **i18n** | 1/5 | German only, no i18n framework |

### Priority Improvements

**Critical (Security)**:
1. Add authentication & authorization
2. Add rate limiting
3. Add audit logging

**High (Reliability)**:
1. Add centralized error handling
2. Add health checks
3. Improve transaction management

**Medium (Maintainability)**:
1. Refactor large services (AppStateService)
2. Add repository pattern abstraction
3. Increase test coverage to 80%

**Low (Performance)**:
1. Add pagination
2. Add caching layer
3. Add response compression
