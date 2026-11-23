# Security Prices (EOD)

## Overview
This repository stores end-of-day (EOD) price history for all securities and exposes the latest EOD close for the portfolio summary.

Code: `apps/api/src/app/security-prices/`

## Data Flow
1. The backend syncs historical prices from the market data provider, either via the daily scheduled job or manually via the API.
2. Prices are persisted in the `security_prices` table with a unique constraint on `(securityId, date)`.
3. After each price sync, exchange rates are synced for all currencies (`ExchangeRatesService.syncAllCurrencies`). A failed exchange-rate sync does not fail the price sync; it is reported in the `exchangeRates` field of the result.
4. The frontend requests the latest price per security and renders it in the securities summary table.

## Provider Strategy
- The application uses Yahoo Finance as the market data provider.
- `SecurityPricesService` depends only on the interface `PriceProvider` (`apps/api/src/app/security-prices/providers/price-provider.ts`), injected via the token `PRICE_PROVIDER`. The Yahoo-specific logic (HTTP request, response parsing) lives in `YahooFinancePriceProvider`, which `SecurityPricesModule` registers as the only provider. A provider signals rate limiting with `PriceProviderRateLimitError`.
- Yahoo Finance chart data is accessed via `query1.finance.yahoo.com` (30 second request timeout).
- Securities are processed sequentially with a 1 second delay between requests.
- On rate limiting (HTTP 429 from Yahoo Finance, reported as `PriceProviderRateLimitError`) a request is retried up to 3 times with exponential backoff (1s, 2s, 4s). Other errors are not retried.
- Prices are inserted in chunks of 500 rows with `skipDuplicates`, so existing prices are not overwritten.
- If a single symbol fails, a warning is logged and the symbol is listed in `failures`; the sync continues with the next security.

## Scheduled Daily Update
`PriceUpdateSchedulerService` (`price-update-scheduler.service.ts`) runs daily at 07:00 (`@Cron('0 0 7 * * *')`, no explicit time zone, so the server time zone applies). The job is always active.

- It determines the last price update date (the oldest "latest date" across all securities) and syncs from the following day up to today.
- If no prices exist yet, it runs a full historical sync starting at `SECURITY_PRICE_HISTORY_START`.
- If prices are already up to date, nothing is fetched.

## API Endpoints
All endpoints require a JWT (`Authorization: Bearer <token>`).

### `POST /api/security-prices/sync`
- Optional query params: `securityId`, `from`, `to`
- Defaults: `from=SECURITY_PRICE_HISTORY_START` (fallback `2017-01-01`), `to=now`
- Runs synchronously within the request and returns provider, date range, processed securities, inserted rows, failures and the exchange-rate sync result.

### `POST /api/security-prices/update-daily`
- Triggers the scheduled daily update manually (same logic as the cron job).
- Returns `{ "message": "Daily price update triggered successfully" }` after the update has finished.

### `GET /api/security-prices/latest`
- Returns one price per security (latest date).

## Environment Variables
- `SECURITY_PRICE_HISTORY_START=2017-01-01` – start date for the historical price sync (default: `2017-01-01`)

## Notes
- Yahoo symbols must match the expected Yahoo format. If your listings need exchange suffixes (e.g. `BMW.DE`), ensure the `symbol` field is stored accordingly.
- The frontend displays the latest close and its trading date, falling back to `-` when no price exists.
