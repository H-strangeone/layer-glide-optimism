import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get all pending transactions
        const pendingTransactions = await prisma.transaction.findMany({
            where: {
                status: 'pending'
            },
            orderBy: {
                timestamp: 'asc'
            },
            select: {
                id: true,
                sender: true,
                recipient: true,
                amount: true,
                status: true,
                timestamp: true
            }
        });

        // Format the response
        const formattedTransactions = pendingTransactions.map(tx => ({
            ...tx,
            timestamp: tx.timestamp.toISOString()
        }));

        return res.status(200).json(formattedTransactions);
    } catch (error) {
        console.error('Error fetching pending transactions:', error);
        return res.status(500).json({ error: 'Failed to fetch pending transactions' });
    }
} 