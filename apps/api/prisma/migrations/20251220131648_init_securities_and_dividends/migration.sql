-- CreateEnum
CREATE TYPE "SecurityType" AS ENUM ('STOCK', 'ETF', 'BOND');

-- CreateTable
CREATE TABLE "securities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "isin" TEXT,
    "wkn" TEXT,
    "type" "SecurityType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "securities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dividend_payments" (
    "id" TEXT NOT NULL,
    "exDate" TIMESTAMP(3) NOT NULL,
    "payoutDate" TIMESTAMP(3) NOT NULL,
    "securityId" TEXT NOT NULL,
    "shares" DECIMAL(19,8) NOT NULL,
    "dividendYield" DECIMAL(19,4) NOT NULL,
    "taxAmount" DECIMAL(19,4) NOT NULL,
    "originCurrency" TEXT NOT NULL,
    "destCurrency" TEXT NOT NULL,
    "conversionRate" DECIMAL(19,8) NOT NULL,
    "finalPayment" DECIMAL(19,4) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dividend_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "securities_symbol_key" ON "securities"("symbol");

-- CreateIndex
CREATE INDEX "securities_isin_idx" ON "securities"("isin");

-- CreateIndex
CREATE INDEX "securities_wkn_idx" ON "securities"("wkn");

-- CreateIndex
CREATE INDEX "dividend_payments_securityId_idx" ON "dividend_payments"("securityId");

-- CreateIndex
CREATE INDEX "dividend_payments_exDate_idx" ON "dividend_payments"("exDate");

-- CreateIndex
CREATE INDEX "dividend_payments_payoutDate_idx" ON "dividend_payments"("payoutDate");

-- CreateIndex
CREATE INDEX "dividend_payments_securityId_exDate_idx" ON "dividend_payments"("securityId", "exDate");

-- AddForeignKey
ALTER TABLE "dividend_payments" ADD CONSTRAINT "dividend_payments_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "securities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
