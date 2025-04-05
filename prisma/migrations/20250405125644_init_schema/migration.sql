/*
  Warnings:

  - You are about to drop the column `deployedAt` on the `ContractDeployment` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `ContractDeployment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Layer2Balance" DROP CONSTRAINT "Layer2Balance_contractAddress_fkey";

-- AlterTable
ALTER TABLE "Batch" ALTER COLUMN "timestamp" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "BatchTransaction" ALTER COLUMN "status" SET DEFAULT 'pending',
ALTER COLUMN "timestamp" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ContractDeployment" DROP COLUMN "deployedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Layer2Balance" ALTER COLUMN "balance" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Operator_address_key" ON "Operator"("address");
