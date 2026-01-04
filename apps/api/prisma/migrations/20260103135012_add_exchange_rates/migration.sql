-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "targetCurrency" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "rate" DECIMAL(19,8) NOT NULL,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exchange_rates_baseCurrency_targetCurrency_idx" ON "exchange_rates"("baseCurrency", "targetCurrency");

-- CreateIndex
CREATE INDEX "exchange_rates_date_idx" ON "exchange_rates"("date");

-- CreateIndex
CREATE INDEX "exchange_rates_baseCurrency_targetCurrency_date_idx" ON "exchange_rates"("baseCurrency", "targetCurrency", "date");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_baseCurrency_targetCurrency_date_key" ON "exchange_rates"("baseCurrency", "targetCurrency", "date");

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_baseCurrency_fkey" FOREIGN KEY ("baseCurrency") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_targetCurrency_fkey" FOREIGN KEY ("targetCurrency") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
