import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const { address } = req.query;
        try {
            const transactions = await prisma.transaction.findMany({
                where: { OR: [{ from: address }, { to: address }] },
            });
            res.status(200).json(transactions);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch transactions' });
        }
    } else if (req.method === 'POST') {
        const { from, to, amount, status } = req.body;
        try {
            const transaction = await prisma.transaction.create({
                data: { from, to, amount, status },
            });
            res.status(200).json(transaction);
        } catch (error) {
            res.status(500).json({ error: 'Failed to save transaction' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
} 