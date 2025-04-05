import { formatEther } from 'ethers';

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
    createdAt: Date;
    status: 'pending' | 'completed' | 'failed';
    type: 'deposit' | 'withdrawal';
}

export const db = {
    async createTransaction(data: TransactionData) {
        try {
            const response = await fetch('http://localhost:5500/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`Failed to create transaction: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating transaction:', error);
            throw error;
        }
    },

    async updateTransactionStatus(hash: string, status: 'pending' | 'completed' | 'failed') {
        try {
            const response = await fetch(`http://localhost:5500/api/transactions/${hash}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status }),
            });

            if (!response.ok) {
                throw new Error(`Failed to update transaction status: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating transaction status:', error);
            throw error;
        }
    },

    async getTransactionsByAddress(address: string) {
        try {
            const response = await fetch(`http://localhost:5500/api/transactions/user/${address}`);

            if (!response.ok) {
                throw new Error(`Failed to get transactions: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting transactions:', error);
            return [];
        }
    },

    async getBalance(address: string) {
        try {
            const response = await fetch(`http://localhost:5500/api/balance/${address}`);

            if (!response.ok) {
                throw new Error(`Failed to get balance: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting balance:', error);
            return { balance: '0' };
        }
    },

    async updateBalance(address: string, layer1?: string, layer2?: string) {
        try {
            const response = await fetch('http://localhost:5500/api/balance/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ address, layer1, layer2 }),
            });

            if (!response.ok) {
                throw new Error(`Failed to update balance: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating balance:', error);
            throw error;
        }
    },

    async createBatch(batchId: number, transactionsRoot: string) {
        try {
            const response = await fetch('http://localhost:5500/api/batches', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ batchId, transactionsRoot }),
            });

            if (!response.ok) {
                throw new Error(`Failed to create batch: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating batch:', error);
            throw error;
        }
    },

    async updateBatchStatus(batchId: number, status: 'pending' | 'verified' | 'finalized') {
        try {
            const response = await fetch(`http://localhost:5500/api/batches/${batchId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status }),
            });

            if (!response.ok) {
                throw new Error(`Failed to update batch status: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating batch status:', error);
            throw error;
        }
    },

    async getBatch(batchId: number) {
        try {
            const response = await fetch(`http://localhost:5500/api/batches/${batchId}`);

            if (!response.ok) {
                throw new Error(`Failed to get batch: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting batch:', error);
            return null;
        }
    }
};

export const createTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    try {
        const response = await fetch('http://localhost:5500/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(transaction),
        });

        if (!response.ok) {
            throw new Error(`Failed to create transaction: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating transaction:', error);
        throw error;
    }
};

export const getTransactions = async (): Promise<Transaction[]> => {
    try {
        const response = await fetch('http://localhost:5500/api/transactions');

        if (!response.ok) {
            throw new Error(`Failed to get transactions: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting transactions:', error);
        return [];
    }
}; 