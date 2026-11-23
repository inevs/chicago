# Currency Management

## Overview

Users can add new currencies through the frontend. Currency codes are validated against an ISO 4217 whitelist on the server. When a currency is added, the API starts a background sync of its exchange rates.

Additional backend details: `apps/api/src/app/currencies/README.md`.

## User Guide: Adding a Currency

### 1. Open the Currency Dialog

1. Click the **"Neu"** button in the header (top right).
2. Select **"Neue Währung"** from the dropdown menu.

The menu entries depend on the current page. "Neue Währung" is available on:

| Page | Route | Entries in the "Neu" menu |
|---|---|---|
| Übersicht | `/uebersicht` | Neues Wertpapier, Neue Buchung, Neue Wertpapier-Transaktion, **Neue Währung** |
| Analysen | `/analysen` | same as Übersicht |
| Portfolio | `/portfolio` | Neues Wertpapier, Wertpapiere importieren (CSV), **Neue Währung** |

On the pages "Alle Wertpapiere", "Dividenden" and "Wertpapiere" the menu shows only the entries for that page (incl. CSV import), not "Neue Währung".

Source: `menuOptions` in `apps/dividends/src/app/layout/header-nav/header-nav.component.ts`.

### 2. Enter the Currency Details

**ISO-Code (3 Buchstaben)**
- 3-letter ISO 4217 code, e.g. `CHF`, `SEK`, `NOK`, `DKK`, `JPY`
- Displayed in uppercase while typing and saved in uppercase

**Name**
- Full currency name, e.g. `Schweizer Franken`, `Schwedische Krone`

### 3. Submit

Click **"Hinzufügen"**. On success:

- the dialog closes,
- a success toast is shown,
- the currency is added to the currency list (sorted alphabetically) and is available in all currency dropdowns,
- the API fetches its exchange rates in the background.

On a server error the dialog stays open and the error message is shown as an error toast. The dialog can be closed with **Escape** or **"Abbrechen"**.

### Error Messages

| Message | Origin | Cause |
|---|---|---|
| "Bitte geben Sie einen ISO-Code ein (z.B. CHF, SEK, JPY)" | Client | Code is empty |
| "ISO-Code muss aus genau 3 Buchstaben bestehen (z.B. CHF, SEK, JPY)" | Client | Code is not exactly 3 letters (too short, or contains digits or special characters) |
| "Bitte geben Sie einen Namen ein (z.B. Schweizer Franken, Schwedische Krone)" | Client | Name is empty or only whitespace |
| "Currency code must be a valid ISO 4217 code (e.g., USD, EUR, CHF)" | Server | Code is not in the ISO 4217 whitelist (e.g. `ABC`) |
| "Currency with code XXX already exists" | Server | Currency already exists |

Client validation: Signal Forms schema in `apps/dividends/src/app/shared/modals/currency-modal/currency-modal.component.ts`. Client messages are shown below the affected field once it was left or the form was submitted; the input field limits the code to 3 characters.

## Architecture

### Backend (`apps/api/src/app/currencies/`)

**ISO 4217 Whitelist**
- `constants/iso-4217-codes.ts`, 124 codes
- Includes major and regional currencies as well as special codes (e.g. XDR, precious metals)
- Note: The list still contains `HRK` (Croatian Kuna), which was replaced by EUR in 2023.

**Custom Validator**
- `validators/is-iso4217-code.validator.ts`: `@IsISO4217Code()` decorator for class-validator
- Tests: `validators/is-iso4217-code.validator.spec.ts`

**DTO Validation** (`dto/create-currency.dto.ts`)
1. `@IsString()`
2. `@Length(3, 3)` – exactly 3 characters
3. `@Matches(/^[A-Za-z]{3}$/)` – letters only
4. `@Transform` – uppercase and trim
5. `@IsISO4217Code()` – whitelist check
6. `name`: `@IsNotEmpty()`, trimmed

The global `ValidationPipe` in `apps/api/src/main.ts` enables transformation and whitelisting of known properties.

**Service** (`currencies.service.ts`)
- Rejects duplicates with `409 Conflict` (message from `CURRENCY_ERRORS` in `packages/shared/src/lib/shared.ts`), also when a concurrent request inserts the same code after the existence check (the repository turns the unique-constraint violation into a `DuplicateRecordError`)
- After creating a currency, starts `ExchangeRatesService.syncExchangeRates(code)` without awaiting it; the result is only logged
- The default currency is taken from the `DEFAULT_CURRENCY` environment variable (fallback `EUR`); the seed creates it from `DEFAULT_CURRENCY` / `DEFAULT_CURRENCY_NAME`

### Frontend

| Part | Location |
|---|---|
| Dialog | `apps/dividends/src/app/shared/modals/currency-modal/` |
| Menu entry | `apps/dividends/src/app/layout/header-nav/header-nav.component.ts` |
| HTTP calls | `apps/dividends/src/app/services/currency.service.ts` |
| Flow and toasts | `TransactionFacadeService.addCurrency()` in `apps/dividends/src/app/services/transaction-facade.service.ts` |

### Validation Flow

```
User input  →  Client validation  →  Server validation      →  Database  →  Exchange-rate sync (background)
Uppercase      3 characters          3 letters, ISO 4217       Currency      ExchangeRate
               letters only          duplicate check
               name not empty
```

## API Endpoints

All endpoints require a JWT (`Authorization: Bearer <token>`).

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/currencies` | List all currencies |
| `POST` | `/api/currencies` | Create a currency |
| `GET` | `/api/currencies/default` | Default currency (from `DEFAULT_CURRENCY`) |

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
  "code": "CHF",
  "name": "Schweizer Franken"
}
```

**Error Responses** (format of the `GlobalExceptionFilter`):

- **400 Bad Request** – invalid code:
  ```json
  {
    "statusCode": 400,
    "message": ["Currency code must be a valid ISO 4217 code (e.g., USD, EUR, CHF)"],
    "error": "Bad Request",
    "correlationId": "…",
    "timestamp": "…",
    "path": "/api/currencies"
  }
  ```

- **409 Conflict** – currency already exists:
  ```json
  {
    "statusCode": 409,
    "message": "Currency with code CHF already exists",
    "error": "Conflict",
    "correlationId": "…",
    "timestamp": "…",
    "path": "/api/currencies"
  }
  ```

Exchange-rate endpoints are provided by the separate module `apps/api/src/app/exchange-rates/`.

### Current Values in EUR

The securities summary (`apps/dividends/src/app/pages/portfolio/securities-summary/`) and the allocation chart (`apps/dividends/src/app/pages/overview/allocation-chart/`) convert the current value of each holding into EUR with `convertToEur()` from `@dividends/shared` (`packages/shared/src/lib/utils/currency-conversion.ts`). The rates come from `GET /api/exchange-rates/latest`, which returns the most recent stored EUR rate per currency regardless of its date.

If no exchange rate exists for a currency at all:

- the securities summary shows a warning icon in the column "Aktueller Wert (EUR)" with the tooltip "Wechselkurs für <CURRENCY> nicht verfügbar"; the total row counts the value as 0,
- the allocation chart leaves the security out.

## Testing

```bash
nx test api -- --testPathPatterns=currencies
```

### Manual Testing Checklist
- [ ] Open the currency dialog from the "Neu" menu (e.g. on `/uebersicht`)
- [ ] Add a valid currency (e.g. CHF, SEK)
- [ ] Try an invalid code (e.g. ABC)
- [ ] Try a code with digits (e.g. AB1)
- [ ] Try a code that is too short (US) or too long (EURO)
- [ ] Try a duplicate currency
- [ ] Verify the currency appears in all dropdowns
- [ ] Close the dialog with Escape

## Possible Enhancements

1. Currency list page with edit/delete options
2. Currency search with autocomplete
3. Usage statistics per currency
4. Mark currencies as inactive instead of deleting them
5. Remove outdated codes (e.g. HRK) from the whitelist
6. Admin action to sync exchange rates for currencies without a rate (#79)
