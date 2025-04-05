/*
  Warnings:

  - You are about to drop the column `timestamp` on the `Batch` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Batch" DROP COLUMN "timestamp",
ADD COLUMN     "creatorAddress" TEXT,
ADD COLUMN     "rejected" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BatchChallenge" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "challengerAddress" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchChallenge_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BatchChallenge" ADD CONSTRAINT "BatchChallenge_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
