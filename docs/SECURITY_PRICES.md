# Security Prices (EOD)

## Overview
This repository stores end-of-day (EOD) price history for all securities and exposes the latest EOD close for the portfolio summary.

## Data Flow
1. The backend syncs historical prices from the configured market data provider.
2. Prices are persisted in the `security_prices` table with a unique constraint on `(securityId, date)`.
3. The frontend requests the latest price per security and renders it in the securities summary table.

## Provider Strategy
- Provider selection is driven by `MARKET_DATA_PROVIDER` (default: `yahoo`).
- Current implementation uses Yahoo Finance chart data via `query1.finance.yahoo.com`.
- The sync skips duplicates and logs warnings when a specific symbol fails.

## Sync Endpoint
- `POST /api/security-prices/sync`
  - Optional query params: `securityId`, `from`, `to`
  - Defaults: `from=2017-01-01`, `to=now`
  - Returns totals for processed securities and inserted rows.

## Latest Price Endpoint
- `GET /api/security-prices/latest`
  - Returns one price per security (latest date).

## Environment Variables
- `MARKET_DATA_PROVIDER=yahoo`
- `SECURITY_PRICE_HISTORY_START=2017-01-01`

## Notes
- Yahoo symbols must match the expected Yahoo format. If your listings need exchange suffixes (e.g. `BMW.DE`), ensure the `symbol` field is stored accordingly.
- The frontend displays the latest close and its trading date, falling back to `-` when no price exists.
