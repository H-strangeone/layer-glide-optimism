import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { address } = req.query;
        if (!address || typeof address !== 'string') {
            return res.status(400).json({ error: 'Invalid address' });
        }

        // Get all transactions where the address is either sender or recipient
        const transactions = await prisma.transaction.findMany({
            where: {
                OR: [
                    { from: address.toLowerCase() },
                    { to: address.toLowerCase() }
                ]
            },
            orderBy: {
                timestamp: 'desc'
            }
        });

        return res.status(200).json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return res.status(500).json({ error: 'Failed to fetch transactions' });
    }
} 