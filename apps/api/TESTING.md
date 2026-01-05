# API Testing Guide

This document explains how to run different types of tests for the API.

## Test Types

### Unit Tests
Unit tests test individual components (services, controllers) in isolation with mocked dependencies.

**Run unit tests:**
```bash
nx test api
```

**Run with coverage:**
```bash
nx test api --coverage
```

### Integration Tests
Integration tests test complete request/response cycles through the API with a SQLite in-memory database.

**Run integration tests:**
```bash
nx run api:test:integration
```

**Note:** Integration tests will:
- Create a test application instance
- Use a SQLite file database (`test.db`) - **completely isolated from your development PostgreSQL database**
- Clean up test data after each test
- No need to start PostgreSQL or run migrations

**SQLite Isolation:**
Integration tests use a separate SQLite database file to ensure your development PostgreSQL data is never touched or modified. The test database is automatically created and cleaned up during test runs.

## Test Factories

Test data factories are available in `src/testing/factories/` for creating test data:

```typescript
import { SecurityFactory, UserFactory, DividendPaymentFactory } from '../testing/factories';

// Create a single security
const security = SecurityFactory.create();

// Create a stock specifically
const stock = SecurityFactory.createStock({ symbol: 'AAPL' });

// Create multiple securities
const securities = SecurityFactory.createMany(5);

// Create with overrides
const customSecurity = SecurityFactory.create({
  name: 'Custom Corp',
  symbol: 'CUST',
  currency: 'USD',
});
```

## Test Utilities

Helper functions are available in `src/testing/integration-test.helper.ts`:

- `createTestApp()` - Creates a test application instance
- `cleanupDatabase(prisma)` - Cleans up test data
- `seedCurrencies(prisma)` - Seeds basic test currencies
- `createAuthenticatedUser(app)` - Creates a user and returns auth token

## Coverage Goals

- **Overall:** 70%+
- **Services:** 80%+
- **Statements:** 90%+
- **Functions:** 85%+

## Current Coverage

Run tests with coverage to see current metrics:
```bash
nx test api --coverage
```

## Writing New Tests

### Unit Tests
Place unit tests next to the file being tested with `.spec.ts` extension:
```
src/app/myfeature/
  ├── myfeature.service.ts
  └── myfeature.service.spec.ts
```

### Integration Tests
Place integration tests with `.integration.spec.ts` extension:
```
src/app/myfeature/
  ├── myfeature.controller.ts
  └── myfeature.controller.integration.spec.ts
```

## Continuous Integration

The test suite runs automatically on:
- Pull requests
- Commits to main branch

Ensure all tests pass before merging:
```bash
# Run all unit tests
nx run-many -t test

# Run API unit tests
nx test api

# Run API integration tests (requires database)
nx run api:test:integration
```
