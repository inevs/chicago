# CSV Parsing Fragility

✅ **RESOLVED** - The CSV parser has been improved to be resilient to format changes.

The parser now:
- Dynamically parses the header line to map column names to indices
- Validates that required columns (TIME_PERIOD, OBS_VALUE) exist
- Logs warnings if the format is unexpected or columns are missing
- Works correctly regardless of column order

See `apps/api/src/app/exchange-rates/exchange-rates.service.ts:216-283` for implementation.
