# Currencies Module

This module manages currency operations for the dividends tracking application.

## Features

- List all available currencies
- Create new currencies with ISO 4217 validation
- Retrieve the default currency

## ISO 4217 Validation

The module implements strict ISO 4217 currency code validation to ensure data integrity.

### Validation Rules

1. **Length**: Currency code must be exactly 3 characters
2. **Format**: Must contain only letters (A-Z)
3. **Valid Code**: Must be a recognized ISO 4217 currency code
4. **Transformation**: Automatically converts to uppercase and trims whitespace

### Supported Currency Codes

The module maintains a comprehensive whitelist of valid ISO 4217 currency codes including:

- Major currencies: USD, EUR, GBP, JPY, CHF, etc.
- European currencies: SEK, NOK, DKK, PLN, CZK, etc.
- Asian currencies: CNY, INR, KRW, SGD, etc.
- And many more...

See `constants/iso-4217-codes.ts` for the complete list.

## API Endpoints

### GET /api/currencies

Returns all currencies in alphabetical order by code.

**Response:**
```json
[
  {
    "code": "EUR",
    "name": "Euro"
  },
  {
    "code": "USD",
    "name": "US Dollar"
  }
]
```

### POST /api/currencies

Creates a new currency.

**Request Body:**
```json
{
  "code": "CHF",
  "name": "Swiss Franc"
}
```

**Validation:**
- `code`: Must be a valid 3-letter ISO 4217 code (automatically uppercased)
- `name`: Required, non-empty string (automatically trimmed)

**Response:**
```json
{
  "code": "CHF",
  "name": "Swiss Franc"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid currency code or missing required fields
  ```json
  {
    "statusCode": 400,
    "message": [
      "Currency code must be a valid ISO 4217 code (e.g., USD, EUR, CHF)"
    ],
    "error": "Bad Request"
  }
  ```

- `409 Conflict`: Currency with this code already exists
  ```json
  {
    "statusCode": 409,
    "message": "Currency with code CHF already exists",
    "error": "Conflict"
  }
  ```

### GET /api/currencies/default

Returns the default currency configured via the `DEFAULT_CURRENCY` environment variable.

**Response:**
```json
{
  "code": "EUR",
  "name": "Euro"
}
```

## Environment Variables

- `DEFAULT_CURRENCY`: The default currency code (defaults to "EUR" if not set)

## Implementation Details

### DTO Validation

The `CreateCurrencyDto` uses multiple validation decorators:

```typescript
@IsString()
@Length(3, 3)
@Matches(/^[A-Za-z]{3}$/)
@Transform(({ value }) => value?.toUpperCase().trim())
@IsISO4217Code()
code: string;
```

### Custom Validator

The `@IsISO4217Code()` decorator is a custom validator that checks against a whitelist of valid ISO 4217 codes:

```typescript
import { IsISO4217Code } from './validators/is-iso4217-code.validator';

export class CreateCurrencyDto {
  @IsISO4217Code()
  code: string;
}
```

### Utilities

```typescript
import { isValidISO4217Code, getAllISO4217Codes } from './constants/iso-4217-codes';

// Check if a code is valid
const isValid = isValidISO4217Code('USD'); // true
const isInvalid = isValidISO4217Code('XXX'); // false

// Get all valid codes
const allCodes = getAllISO4217Codes(); // ['AED', 'AFN', 'ALL', ...]
```

## Testing

Run the tests with:

```bash
nx test api -- --testPathPatterns=currencies
```

The test suite includes:
- Valid ISO 4217 code acceptance
- Invalid code rejection
- Lowercase to uppercase transformation
- Whitespace trimming
- Length validation
- Character format validation
- Empty name rejection
