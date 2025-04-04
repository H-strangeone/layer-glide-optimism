import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userAddress, contractAddress, balance } = req.body;

        if (!userAddress || !contractAddress || !balance) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Update or create the balance record
        const updatedBalance = await prisma.layer2Balance.upsert({
            where: {
                userAddress_contractAddress: {
                    userAddress,
                    contractAddress
                }
            },
            create: {
                userAddress,
                contractAddress,
                balance
            },
            update: {
                balance
            }
        });

        return res.status(200).json(updatedBalance);
    } catch (error) {
        console.error('Error updating balance:', error);
        return res.status(500).json({ error: 'Failed to update balance' });
    }
} 