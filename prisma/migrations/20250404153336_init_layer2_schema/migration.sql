-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "contractAddress" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "contractAddress" TEXT;

-- CreateTable
CREATE TABLE "ContractDeployment" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "deployedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ContractDeployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Layer2Balance" (
    "id" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "balance" TEXT NOT NULL DEFAULT '0',
    "contractAddress" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Layer2Balance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractDeployment_address_key" ON "ContractDeployment"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Layer2Balance_userAddress_contractAddress_key" ON "Layer2Balance"("userAddress", "contractAddress");

-- AddForeignKey
ALTER TABLE "Layer2Balance" ADD CONSTRAINT "Layer2Balance_contractAddress_fkey" FOREIGN KEY ("contractAddress") REFERENCES "ContractDeployment"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
