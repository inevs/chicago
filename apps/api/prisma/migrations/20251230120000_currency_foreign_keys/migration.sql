-- Backfill currencies for existing data
INSERT INTO "currencies" ("id", "code", "name", "createdAt")
SELECT gen_random_uuid(), codes.code, codes.code, CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT "currency" AS code FROM "securities"
    UNION
    SELECT DISTINCT "originCurrency" AS code FROM "dividend_payments"
    UNION
    SELECT DISTINCT "destCurrency" AS code FROM "dividend_payments"
    UNION
    SELECT DISTINCT "currency" AS code FROM "security_transactions"
) AS codes
LEFT JOIN "currencies" existing ON existing."code" = codes.code
WHERE existing."code" IS NULL;

-- Add foreign key constraints
ALTER TABLE "securities"
ADD CONSTRAINT "securities_currency_fkey"
FOREIGN KEY ("currency") REFERENCES "currencies"("code")
ON UPDATE CASCADE
ON DELETE RESTRICT;

ALTER TABLE "dividend_payments"
ADD CONSTRAINT "dividend_payments_originCurrency_fkey"
FOREIGN KEY ("originCurrency") REFERENCES "currencies"("code")
ON UPDATE CASCADE
ON DELETE RESTRICT;

ALTER TABLE "dividend_payments"
ADD CONSTRAINT "dividend_payments_destCurrency_fkey"
FOREIGN KEY ("destCurrency") REFERENCES "currencies"("code")
ON UPDATE CASCADE
ON DELETE RESTRICT;

ALTER TABLE "security_transactions"
ADD CONSTRAINT "security_transactions_currency_fkey"
FOREIGN KEY ("currency") REFERENCES "currencies"("code")
ON UPDATE CASCADE
ON DELETE RESTRICT;
