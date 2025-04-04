import { PrismaClient } from '@prisma/client';
import { formatEther } from 'ethers';

const prisma = new PrismaClient();

export interface TransactionData {
    hash: string;
    from: string;
    to: string;
    amount: string;
    type: 'deposit' | 'withdraw' | 'transfer';
    layer: 'layer1' | 'layer2';
    batchId?: number;
    merkleProof?: string;
    status?: 'pending' | 'completed' | 'failed';
}

export interface BalanceData {
    address: string;
    layer1: string;
    layer2: string;
}

export interface Transaction {
    id: string;
    from: string;
    to: string;
    amount: string;
    timestamp: Date;
    status: 'pending' | 'completed' | 'failed';
    type: 'deposit' | 'withdrawal';
}

export const db = {
    // Transaction operations
    async createTransaction(data: TransactionData) {
        return prisma.transaction.create({
            data: {
                ...data,
                status: 'pending'
            }
        });
    },

    async updateTransactionStatus(hash: string, status: 'pending' | 'completed' | 'failed') {
        return prisma.transaction.update({
            where: { hash },
            data: { status }
        });
    },

    async getTransactionsByAddress(address: string) {
        return prisma.transaction.findMany({
            where: {
                OR: [
                    { from: address.toLowerCase() },
                    { to: address.toLowerCase() }
                ]
            },
            orderBy: { timestamp: 'desc' }
        });
    },

    // Balance operations
    async getBalance(address: string) {
        return prisma.balance.findUnique({
            where: { address: address.toLowerCase() }
        });
    },

    async updateBalance(address: string, layer1?: string, layer2?: string) {
        const existing = await prisma.balance.findUnique({
            where: { address: address.toLowerCase() }
        });

        if (existing) {
            return prisma.balance.update({
                where: { address: address.toLowerCase() },
                data: {
                    layer1: layer1 || existing.layer1,
                    layer2: layer2 || existing.layer2
                }
            });
        }

        return prisma.balance.create({
            data: {
                address: address.toLowerCase(),
                layer1: layer1 || '0',
                layer2: layer2 || '0'
            }
        });
    },

    // Batch operations
    async createBatch(batchId: number, transactionsRoot: string) {
        return prisma.batch.create({
            data: {
                batchId,
                transactionsRoot,
                status: 'pending'
            }
        });
    },

    async updateBatchStatus(batchId: number, status: 'pending' | 'verified' | 'finalized') {
        return prisma.batch.update({
            where: { batchId },
            data: { status }
        });
    },

    async getBatch(batchId: number) {
        return prisma.batch.findUnique({
            where: { batchId }
        });
    }
};

export const createTransaction = async (transaction: Omit<Transaction, 'id' | 'timestamp'>) => {
    try {
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(transaction),
        });

        if (!response.ok) {
            throw new Error('Failed to create transaction');
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating transaction:', error);
        throw error;
    }
};

export const getTransactions = async (): Promise<Transaction[]> => {
    try {
        const response = await fetch('/api/transactions');
        if (!response.ok) {
            throw new Error('Failed to fetch transactions');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching transactions:', error);
        throw error;
    }
}; 