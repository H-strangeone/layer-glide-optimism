import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getLayer1Balance, getLayer2Balance } from '@/lib/ethers';
import { formatEther } from 'ethers';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { address } = req.query;

    if (!address || typeof address !== 'string') {
        return res.status(400).json({ error: 'Invalid address parameter' });
    }

    try {
        // Get balances from blockchain
        const [layer1Balance, layer2Balance] = await Promise.all([
            getLayer1Balance(address),
            getLayer2Balance(address)
        ]);

        // Update database with latest balances
        await prisma.balance.upsert({
            where: { address },
            create: {
                address,
                layer1Balance: layer1Balance.toString(),
                layer2Balance: layer2Balance.toString(),
                lastUpdated: new Date()
            },
            update: {
                layer1Balance: layer1Balance.toString(),
                layer2Balance: layer2Balance.toString(),
                lastUpdated: new Date()
            }
        });

        return res.status(200).json({
            layer1Balance: formatEther(layer1Balance),
            layer2Balance: formatEther(layer2Balance)
        });
    } catch (error) {
        console.error('Error fetching balances:', error);
        return res.status(500).json({ error: 'Failed to fetch balances' });
    }
} 