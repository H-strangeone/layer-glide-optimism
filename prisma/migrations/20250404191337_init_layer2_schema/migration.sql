/*
  Warnings:

  - You are about to drop the column `status` on the `Batch` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `Transaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Batch" DROP COLUMN "status",
ADD COLUMN     "finalized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "timestamp",
ALTER COLUMN "status" SET DEFAULT 'pending';
