import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import MerkleTree from './merkleTree.js';

const prisma = new PrismaClient();

// Configuration
const BATCH_SIZE = 10; // Number of transactions per batch
const CHALLENGE_PERIOD = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const MIN_BOND_AMOUNT = ethers.utils.parseEther('0.1'); // 0.1 ETH bond for operators

/**
 * Creates a new batch from pending transactions
 * @returns {Promise<Object>} The created batch
 */
export async function createBatch() {
    try {
        // Get pending transactions
        const pendingTransactions = await prisma.batchTransaction.findMany({
            where: {
                batchId: null,
                status: 'pending'
            },
            take: BATCH_SIZE,
            orderBy: {
                createdAt: 'asc'
            }
        });

        if (pendingTransactions.length === 0) {
            return { success: false, message: 'No pending transactions to batch' };
        }

        // Create a new batch
        const batchId = `batch-${Date.now()}`;

        // Calculate merkle root from transactions
        const leaves = pendingTransactions.map(tx =>
            ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(
                    ['address', 'address', 'uint256'],
                    [tx.from, tx.to, tx.value]
                )
            )
        );

        const merkleTree = new MerkleTree(leaves);
        const transactionsRoot = merkleTree.getRoot();

        // Create the batch in the database
        const batch = await prisma.batch.create({
            data: {
                batchId,
                transactionsRoot,
                verified: false,
                finalized: false,
                rejected: false
            }
        });

        // Update transactions with batch ID
        await prisma.batchTransaction.updateMany({
            where: {
                id: {
                    in: pendingTransactions.map(tx => tx.id)
                }
            },
            data: {
                batchId: batch.id,
                status: 'batched'
            }
        });

        return {
            success: true,
            batch,
            transactionCount: pendingTransactions.length
        };
    } catch (error) {
        console.error('Error creating batch:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Verifies a batch and updates transaction statuses
 * @param {string} batchId - The ID of the batch to verify
 * @returns {Promise<Object>} The verification result
 */
export async function verifyBatch(batchId) {
    try {
        // Find the batch
        const batch = await prisma.batch.findUnique({
            where: { batchId },
            include: { transactions: true }
        });

        if (!batch) {
            return { success: false, message: 'Batch not found' };
        }

        if (batch.verified) {
            return { success: false, message: 'Batch already verified' };
        }

        // In a real implementation, this would verify the batch on the blockchain
        // For now, we'll just mark it as verified
        const updatedBatch = await prisma.batch.update({
            where: { id: batch.id },
            data: { verified: true },
            include: { transactions: true }
        });

        // Update transaction statuses
        await prisma.batchTransaction.updateMany({
            where: { batchId: batch.id },
            data: { status: 'verified' }
        });

        return { success: true, batch: updatedBatch };
    } catch (error) {
        console.error('Error verifying batch:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Finalizes a batch after the challenge period
 * @param {string} batchId - The ID of the batch to finalize
 * @returns {Promise<Object>} The finalization result
 */
export async function finalizeBatch(batchId) {
    try {
        // Find the batch
        const batch = await prisma.batch.findUnique({
            where: { batchId },
            include: { transactions: true }
        });

        if (!batch) {
            return { success: false, message: 'Batch not found' };
        }

        if (!batch.verified) {
            return { success: false, message: 'Batch must be verified before finalization' };
        }

        if (batch.finalized) {
            return { success: false, message: 'Batch already finalized' };
        }

        // Check if challenge period has passed
        const challengeDeadline = new Date(batch.createdAt.getTime() + CHALLENGE_PERIOD);
        if (new Date() < challengeDeadline) {
            return {
                success: false,
                message: 'Challenge period not yet passed',
                challengeDeadline
            };
        }

        // Finalize the batch
        const updatedBatch = await prisma.batch.update({
            where: { id: batch.id },
            data: { finalized: true },
            include: { transactions: true }
        });

        // Update transaction statuses
        await prisma.batchTransaction.updateMany({
            where: { batchId: batch.id },
            data: { status: 'finalized' }
        });

        // Update L2 balances
        for (const tx of batch.transactions) {
            // Deduct from sender's balance
            await updateL2Balance(tx.from, tx.value, true);

            // Add to recipient's balance
            await updateL2Balance(tx.to, tx.value, false);
        }

        return { success: true, batch: updatedBatch };
    } catch (error) {
        console.error('Error finalizing batch:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Updates an L2 balance
 * @param {string} address - The address to update
 * @param {string} amount - The amount to update by
 * @param {boolean} isDeduction - Whether this is a deduction (true) or addition (false)
 * @returns {Promise<Object>} The update result
 */
export async function updateL2Balance(address, amount, isDeduction) {
    try {
        // Get the active contract deployment
        const activeDeployment = await prisma.contractDeployment.findFirst({
            where: { isActive: true }
        });

        if (!activeDeployment) {
            return { success: false, message: 'No active contract deployment found' };
        }

        // Find the current balance
        const currentBalance = await prisma.layer2Balance.findUnique({
            where: {
                userAddress_contractAddress: {
                    userAddress: address.toLowerCase(),
                    contractAddress: activeDeployment.address
                }
            }
        });

        // Calculate new balance
        const currentAmount = currentBalance ? BigInt(currentBalance.balance) : BigInt(0);
        const updateAmount = BigInt(amount);
        const newAmount = isDeduction
            ? currentAmount - updateAmount
            : currentAmount + updateAmount;

        // Update or create the balance
        if (currentBalance) {
            await prisma.layer2Balance.update({
                where: {
                    userAddress_contractAddress: {
                        userAddress: address.toLowerCase(),
                        contractAddress: activeDeployment.address
                    }
                },
                data: { balance: newAmount.toString() }
            });
        } else {
            await prisma.layer2Balance.create({
                data: {
                    userAddress: address.toLowerCase(),
                    contractAddress: activeDeployment.address,
                    balance: newAmount.toString()
                }
            });
        }

        return { success: true, newBalance: newAmount.toString() };
    } catch (error) {
        console.error('Error updating L2 balance:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Submits a fraud proof for a batch
 * @param {string} batchId - The ID of the batch to challenge
 * @param {string} challengerAddress - The address of the challenger
 * @param {Object} fraudProof - The fraud proof data
 * @returns {Promise<Object>} The challenge result
 */
export async function submitFraudProof(batchId, challengerAddress, fraudProof) {
    try {
        // Find the batch
        const batch = await prisma.batch.findUnique({
            where: { batchId },
            include: { transactions: true }
        });

        if (!batch) {
            return { success: false, message: 'Batch not found' };
        }

        if (batch.rejected) {
            return { success: false, message: 'Batch already rejected' };
        }

        if (batch.finalized) {
            return { success: false, message: 'Cannot challenge a finalized batch' };
        }

        // In a real implementation, this would verify the fraud proof
        // For now, we'll just mark the batch as rejected
        const updatedBatch = await prisma.batch.update({
            where: { id: batch.id },
            data: {
                rejected: true,
                rejectionReason: fraudProof.reason || 'Fraud proof submitted'
            },
            include: { transactions: true }
        });

        // Update transaction statuses
        await prisma.batchTransaction.updateMany({
            where: { batchId: batch.id },
            data: { status: 'rejected' }
        });

        return { success: true, batch: updatedBatch };
    } catch (error) {
        console.error('Error submitting fraud proof:', error);
        return { success: false, error: error.message };
    }
} 