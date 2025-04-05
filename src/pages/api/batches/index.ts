import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const batches = await prisma.batch.findMany({
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    transactions: true
                }
            });

            return res.status(200).json(batches);
        } catch (error) {
            console.error('Error fetching batches:', error);
            return res.status(500).json({ error: 'Failed to fetch batches' });
        }
    }

    if (req.method === 'POST') {
        try {
            const { batchId, transactionsRoot, transactions } = req.body;

            // Create batch with transactions in a transaction
            const batch = await prisma.$transaction(async (prisma) => {
                const newBatch = await prisma.batch.create({
                    data: {
                        batchId,
                        transactionsRoot,
                        transactions: {
                            create: transactions.map((tx: any) => ({
                                from: tx.from,
                                to: tx.to,
                                value: tx.value,
                                status: tx.status
                            }))
                        }
                    },
                    include: {
                        transactions: true
                    }
                });

                return newBatch;
            });

            return res.status(201).json(batch);
        } catch (error) {
            console.error('Error creating batch:', error);
            return res.status(500).json({ error: 'Failed to create batch' });
        }
    }

    if (req.method === 'PUT') {
        try {
            const { batchId, verified, finalized } = req.body;

            const batch = await prisma.batch.update({
                where: { batchId },
                data: {
                    verified,
                    finalized
                },
                include: {
                    transactions: true
                }
            });

            return res.status(200).json(batch);
        } catch (error) {
            console.error('Error updating batch:', error);
            return res.status(500).json({ error: 'Failed to update batch' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
} 