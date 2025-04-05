import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get all pending transactions that haven't been included in a batch
        const transactions = await prisma.batchTransaction.findMany({
            where: {
                status: 'pending'
            },
            orderBy: {
                createdAt: 'asc'
            },
            include: {
                batch: true
            }
        });

        return res.status(200).json({ transactions });
    } catch (error) {
        console.error('Error fetching pending transactions:', error);
        return res.status(500).json({ error: 'Failed to fetch pending transactions' });
    }
} 