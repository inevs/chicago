/*
  Warnings:

  - Added the required column `currency` to the `securities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `exchange` to the `securities` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "securities" ADD COLUMN     "currency" TEXT NOT NULL,
ADD COLUMN     "exchange" TEXT NOT NULL;
