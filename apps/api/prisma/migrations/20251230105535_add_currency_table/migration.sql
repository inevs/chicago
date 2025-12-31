-- CreateTable
CREATE TABLE "currencies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- Insert default currencies
INSERT INTO "currencies" ("id", "code", "name", "createdAt") VALUES
    (gen_random_uuid(), 'EUR', 'Euro', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'USD', 'US Dollar', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'GBP', 'British Pound', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'NOK', 'Norwegian Krone', CURRENT_TIMESTAMP);
