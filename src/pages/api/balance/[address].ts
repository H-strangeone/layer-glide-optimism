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

        // Get the latest active contract deployment
        const latestDeployment = await prisma.contractDeployment.findFirst({
            where: { isActive: true },
            include: {
                balances: {
                    where: { userAddress: address }
                }
            },
            orderBy: { deployedAt: 'desc' }
        });

        if (!latestDeployment?.balances[0]) {
            return res.status(200).json({ balance: '0' });
        }

        return res.status(200).json({ balance: latestDeployment.balances[0].balance });
    } catch (error) {
        console.error('Error fetching balance:', error);
        return res.status(500).json({ error: 'Failed to fetch balance' });
    }
} 