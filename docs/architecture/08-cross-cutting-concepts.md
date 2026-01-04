# 8. Cross-Cutting Concepts

## 8.1 Validation Strategy

### Multi-Layer Validation

The application implements defense-in-depth validation across three layers:

#### Layer 1: Client-Side (Angular)

**Purpose**: Immediate user feedback, better UX

**Implementation**:
- Template-driven validation in forms
- Real-time feedback on input
- Pattern matching, length validation
- Custom validators where needed

**Example** (Currency Modal):
```typescript
// Code must be exactly 3 letters
if (code.length !== 3 || !/^[A-Z]+$/.test(code)) {
  // Show error
}
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
@Matches(/^[A-Z]+$/)
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

**Limitations**:
- ❌ No centralized exception filter
- ❌ Inconsistent error response format
- ❌ Limited error logging
- ❌ No error tracking/monitoring

#### Frontend Error Handling

**HTTP Errors**:
```typescript
this.service.create(dto).subscribe({
  next: (result) => { /* success */ },
  error: (error) => {
    // Extract message from error.error.message
    this.toastService.error(message);
  }
});
```

**Limitations**:
- ❌ Error handling duplicated across components
- ❌ No centralized HTTP interceptor
- ❌ Limited error recovery
- ❌ No offline detection

### Recommended Improvements

#### 1. Centralized Exception Filter (Backend)

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Transform all exceptions to consistent format
    // Log errors
    // Return structured response
  }
}
```

#### 2. HTTP Interceptor (Frontend)

```typescript
export class ErrorInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    return next.handle(req).pipe(
      catchError(error => {
        // Centralized error handling
        // Toast notifications
        // Error logging
        return throwError(() => error);
      })
    );
  }
}
```

## 8.3 Logging Strategy

### Current Implementation

**Backend**:
- NestJS Logger used in some services
- Manual `console.log` in some places
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
- ❌ No correlation IDs
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
- `PORT`: API server port
- `SECURITY_PRICE_HISTORY_START`: Default sync start date

**Limitations**:
- ❌ No validation of environment variables at startup
- ❌ No type-safe configuration
- ❌ Hardcoded values in code (e.g., EUR base currency)

### Recommended Improvements

**1. Configuration Module**:
```typescript
@Injectable()
export class ConfigService {
  @ValidateNested()
  database: DatabaseConfig;

  @ValidateNested()
  api: ApiConfig;

  constructor() {
    // Validate on startup
    // Throw error if invalid
  }
}
```

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
- ✅ No raw SQL

**XSS Prevention**:
- ✅ Angular automatic escaping
- ✅ No `innerHTML` usage (assumed)

**CSRF Prevention**:
- ❌ Not implemented (no authentication)

**Input Validation**:
- ✅ Multi-layer validation

**Authentication/Authorization**:
- ❌ **CRITICAL**: No authentication
- ❌ **CRITICAL**: No authorization
- ❌ Open API

### Recommended Security Improvements

**Priority 1 (Critical)**:
1. **Add Authentication**: JWT or session-based
2. **Add Authorization**: Role-based access control
3. **Rate Limiting**: Prevent abuse
4. **CORS Configuration**: Restrict origins

**Priority 2 (High)**:
1. **Request Size Limits**: Already configured (200MB - possibly too high)
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
- Some unit tests (e.g., ISO 4217 validator)
- E2E tests configured (`api-e2e` project)

**Frontend**:
- Jest configured
- Limited test coverage

**Limitations**:
- ⚠️ Low test coverage
- ❌ No integration tests for critical flows
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
- ✅ OnPush change detection (assumed)

**API**:
- ⚠️ No caching
- ⚠️ No pagination (except implicit TAKE 10 in search)
- ⚠️ Large payload support (200MB limit)

### Recommended Improvements

**1. Caching**:
```typescript
// Cache frequently accessed data
@CacheTTL(300) // 5 minutes
async getCurrencies() {
  return this.prisma.currency.findMany();
}
```

**2. Pagination**:
```typescript
// Paginate large lists
async getDividends(page: number, limit: number) {
  return this.prisma.dividendPayment.findMany({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { payoutDate: 'desc' }
  });
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
