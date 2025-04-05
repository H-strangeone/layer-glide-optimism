/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Balance` table. All the data in the column will be lost.
  - You are about to drop the column `layer1` on the `Balance` table. All the data in the column will be lost.
  - You are about to drop the column `layer2` on the `Balance` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Balance` table. All the data in the column will be lost.
  - You are about to drop the column `contractAddress` on the `Batch` table. All the data in the column will be lost.
  - You are about to drop the column `batchId` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `contractAddress` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `hash` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `layer` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `merkleProof` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Transaction` table. All the data in the column will be lost.
  - Added the required column `layer1Balance` to the `Balance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `layer2Balance` to the `Balance` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Transaction_hash_key";

-- AlterTable
ALTER TABLE "Balance" DROP COLUMN "createdAt",
DROP COLUMN "layer1",
DROP COLUMN "layer2",
DROP COLUMN "updatedAt",
ADD COLUMN     "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "layer1Balance" TEXT NOT NULL,
ADD COLUMN     "layer2Balance" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Batch" DROP COLUMN "contractAddress",
ALTER COLUMN "batchId" SET DATA TYPE TEXT,
ALTER COLUMN "timestamp" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "batchId",
DROP COLUMN "contractAddress",
DROP COLUMN "createdAt",
DROP COLUMN "hash",
DROP COLUMN "layer",
DROP COLUMN "merkleProof",
DROP COLUMN "type",
DROP COLUMN "updatedAt",
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "status" DROP DEFAULT;

-- CreateTable
CREATE TABLE "BatchTransaction" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchTransaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BatchTransaction" ADD CONSTRAINT "BatchTransaction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
