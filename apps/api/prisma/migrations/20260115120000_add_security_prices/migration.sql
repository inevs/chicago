-- CreateTable
CREATE TABLE "security_prices" (
    "id" TEXT NOT NULL,
    "securityId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "open" DECIMAL(19,6) NOT NULL,
    "high" DECIMAL(19,6) NOT NULL,
    "low" DECIMAL(19,6) NOT NULL,
    "close" DECIMAL(19,6) NOT NULL,
    "volume" DECIMAL(22,4),
    "currency" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "security_prices_securityId_date_key" ON "security_prices"("securityId", "date");

-- CreateIndex
CREATE INDEX "security_prices_securityId_idx" ON "security_prices"("securityId");

-- CreateIndex
CREATE INDEX "security_prices_date_idx" ON "security_prices"("date");

-- CreateIndex
CREATE INDEX "security_prices_securityId_date_idx" ON "security_prices"("securityId", "date");

-- AddForeignKey
ALTER TABLE "security_prices" ADD CONSTRAINT "security_prices_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "securities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
