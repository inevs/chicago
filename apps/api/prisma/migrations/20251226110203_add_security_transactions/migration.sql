-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BUY', 'SELL');

-- CreateTable
CREATE TABLE "security_transactions" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "securityId" TEXT NOT NULL,
    "quantity" DECIMAL(19,8) NOT NULL,
    "pricePerShare" DECIMAL(19,4) NOT NULL,
    "fees" DECIMAL(19,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "exchangeRate" DECIMAL(19,8) NOT NULL,
    "totalValue" DECIMAL(19,4) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_transactions_securityId_idx" ON "security_transactions"("securityId");

-- CreateIndex
CREATE INDEX "security_transactions_date_idx" ON "security_transactions"("date");

-- CreateIndex
CREATE INDEX "security_transactions_type_idx" ON "security_transactions"("type");

-- CreateIndex
CREATE INDEX "security_transactions_securityId_date_idx" ON "security_transactions"("securityId", "date");

-- AddForeignKey
ALTER TABLE "security_transactions" ADD CONSTRAINT "security_transactions_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "securities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
