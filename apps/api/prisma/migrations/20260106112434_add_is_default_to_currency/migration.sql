-- DropIndex
DROP INDEX "exchange_rates_baseCurrency_targetCurrency_date_idx";

-- AlterTable
ALTER TABLE "currencies" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "exchange_rates_baseCurrency_targetCurrency_date_idx" ON "exchange_rates"("baseCurrency", "targetCurrency", "date" DESC);
