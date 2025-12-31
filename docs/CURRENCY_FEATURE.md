# Currency Management Feature

## Overview

A complete currency management system has been implemented, allowing users to add new currencies through the frontend UI with full ISO 4217 validation on both client and server sides.

## Features

### 1. Backend Validation (API)

**ISO 4217 Whitelist**
- Comprehensive list of 140+ valid ISO 4217 currency codes
- Location: `apps/api/src/app/currencies/constants/iso-4217-codes.ts`
- Includes major currencies, regional currencies, and special codes (XDR, precious metals)

**Custom Validator**
- Location: `apps/api/src/app/currencies/validators/is-iso4217-code.validator.ts`
- `@IsISO4217Code()` decorator for class-validator
- Validates against the official ISO 4217 whitelist
- Provides clear error messages

**DTO Validation** (`apps/api/src/app/currencies/dto/create-currency.dto.ts`)
- Multi-layer validation:
  1. Type checking (must be string)
  2. Length validation (exactly 3 characters)
  3. Format validation (letters only)
  4. Automatic transformation (uppercase + trim)
  5. ISO 4217 whitelist validation
- Server-side transformation ensures data consistency

**Global ValidationPipe** (`apps/api/src/main.ts`)
- Enabled with transformation support
- Automatic type conversion
- Whitelists known properties

**Comprehensive Tests**
- Location: `apps/api/src/app/currencies/validators/is-iso4217-code.validator.spec.ts`
- 7 test cases covering all validation scenarios
- All tests passing ✓

### 2. Frontend UI

**Currency Modal Component**
- Location: `apps/dividends/src/app/components/dashboard/currency-modal/`
- Clean, modern modal design with dark mode support
- Real-time uppercase conversion as user types
- Client-side validation with inline error messages
- Accessible keyboard navigation (Escape to close)

**Header Menu Integration**
- Added "Neue Währung" button to the "Neu" dropdown menu in the header
- Purple currency icon for visual distinction
- Consistent styling with other menu items

**State Management**
- Integrated with `AppStateService`
- Automatic modal open/close
- Currencies list automatically sorted alphabetically
- Success/error notifications via alerts

**Validation Flow**
```
User Input → Client Validation → Backend Validation → Database
     ↓              ↓                      ↓
Uppercase      3 letters         ISO 4217 Check
   Trim        Letters only     Duplicate Check
```

## User Flow

1. **Opening the Modal**
   - Click "Neu" button in the header (top right)
   - Select "Neue Währung" from the dropdown menu
   - Modal appears with two input fields

2. **Entering Currency Data**
   - **ISO-Code**: 3-letter code (automatically converted to uppercase)
     - Examples: CHF, SEK, JPY, NOK, DKK
   - **Name**: Full currency name
     - Examples: Schweizer Franken, Schwedische Krone

3. **Validation**
   - Client-side: Immediate feedback on format errors
   - Server-side: ISO 4217 whitelist check, duplicate prevention
   - Clear error messages in German

4. **Success**
   - Modal closes automatically
   - Currency added to the system
   - Available immediately in all dropdowns
   - Success notification displayed

## API Endpoint

### POST /api/currencies

**Request:**
```json
{
  "code": "CHF",
  "name": "Schweizer Franken"
}
```

**Success Response (201):**
```json
{
  "id": "uuid",
  "code": "CHF",
  "name": "Schweizer Franken",
  "createdAt": "2025-01-01T12:00:00Z"
}
```

**Error Responses:**

- **400 Bad Request** - Invalid ISO 4217 code:
  ```json
  {
    "statusCode": 400,
    "message": ["Currency code must be a valid ISO 4217 code (e.g., USD, EUR, CHF)"],
    "error": "Bad Request"
  }
  ```

- **409 Conflict** - Currency already exists:
  ```json
  {
    "statusCode": 409,
    "message": "Currency with code CHF already exists",
    "error": "Conflict"
  }
  ```

## Validation Rules

### Client-Side (Frontend)
- Code must be exactly 3 characters
- Code must contain only letters
- Name must not be empty
- Automatic uppercase conversion
- Automatic trimming of whitespace

### Server-Side (Backend)
- All client-side rules enforced
- Code must be in ISO 4217 whitelist
- No duplicate currency codes allowed
- Server-side transformation (defensive programming)

## Supported Currencies

The system supports all standard ISO 4217 currency codes, including:

**Major Currencies:**
USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD, CNY, HKD, SGD

**European Currencies:**
SEK, NOK, DKK, PLN, CZK, HUF, RON, BGN, HRK, ISK

**Asian Currencies:**
KRW, INR, THB, IDR, MYR, PHP, VND, BDT, PKR

**And many more...**

See `apps/api/src/app/currencies/constants/iso-4217-codes.ts` for the complete list.

## Error Handling

### Frontend Errors
- Displayed inline in the modal with red styling
- Clear, user-friendly messages in German
- Form stays open for correction

### Backend Errors
- Validation errors extracted and displayed to user
- Network errors handled gracefully
- Console logging for debugging

## Files Modified/Created

### Backend (API)
- ✨ `apps/api/src/app/currencies/constants/iso-4217-codes.ts` (new)
- ✨ `apps/api/src/app/currencies/validators/is-iso4217-code.validator.ts` (new)
- ✨ `apps/api/src/app/currencies/validators/is-iso4217-code.validator.spec.ts` (new)
- ✨ `apps/api/src/app/currencies/README.md` (new)
- 🔧 `apps/api/src/app/currencies/dto/create-currency.dto.ts` (enhanced)
- 🔧 `apps/api/src/app/currencies/currencies.service.ts` (enhanced)
- 🔧 `apps/api/src/main.ts` (added ValidationPipe)

### Frontend (Dividends)
- 🔧 `apps/dividends/src/app/components/dashboard/header-nav/header-nav.component.html` (added button)
- 🔧 `apps/dividends/src/app/components/dashboard/header-nav/header-nav.component.ts` (added handler)
- 🔧 `apps/dividends/src/app/components/dashboard/currency-modal/currency-modal.component.ts` (enhanced validation)
- 🔧 `apps/dividends/src/app/components/dashboard/currency-modal/currency-modal.component.html` (added error display)
- 🔧 `apps/dividends/src/app/services/app-state.service.ts` (enhanced error handling)

## Testing

### Run Backend Tests
```bash
nx test api -- --testPathPatterns=currencies
```

### Manual Testing Checklist
- [ ] Open currency modal from header menu
- [ ] Try adding a valid currency (e.g., CHF, SEK)
- [ ] Try adding an invalid code (e.g., XXX, ABC)
- [ ] Try adding a code with numbers (e.g., AB1)
- [ ] Try adding a code that's too short (e.g., US)
- [ ] Try adding a code that's too long (e.g., EURO)
- [ ] Try adding a duplicate currency
- [ ] Verify currency appears in all dropdowns
- [ ] Test dark mode styling
- [ ] Test keyboard navigation (Escape key)

## Benefits

1. **Data Integrity**: Only valid ISO 4217 codes accepted
2. **User Experience**: Clear validation with helpful messages
3. **Flexibility**: Users can add currencies as needed
4. **Consistency**: Automatic normalization (uppercase, trim)
5. **Reliability**: Multi-layer validation (client + server)
6. **Maintainability**: Centralized currency code list
7. **Testability**: Comprehensive test coverage
8. **Security**: Server-side validation cannot be bypassed

## Future Enhancements

Potential improvements for future versions:

1. **Currency List Page**: Dedicated page showing all currencies with edit/delete options
2. **Exchange Rates**: Integration with currency exchange rate APIs
3. **Currency Icons**: Add flag icons for better visual identification
4. **Bulk Import**: Import multiple currencies at once
5. **Currency Search**: Autocomplete with currency suggestions
6. **Usage Statistics**: Show which currencies are actively used
7. **Deprecation**: Mark currencies as inactive instead of deleting
8. **Audit Trail**: Track who added which currencies and when
