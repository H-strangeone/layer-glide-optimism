const express = require('express');
const next = require('next');
const { PrismaClient } = require('@prisma/client');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();

app.prepare().then(() => {
    const server = express();

    // API Routes
    server.post('/api/balance/update', async (req, res) => {
        try {
            const { userAddress, contractAddress, balance } = req.body;

            if (!userAddress || !contractAddress || !balance) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

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
    });

    server.get('/api/balance/:address', async (req, res) => {
        try {
            const { address } = req.params;

            if (!address) {
                return res.status(400).json({ error: 'Invalid address' });
            }

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
    });

    server.get('/api/transactions/pending', async (req, res) => {
        try {
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

            const formattedTransactions = pendingTransactions.map(tx => ({
                ...tx,
                timestamp: tx.timestamp.toISOString()
            }));

            return res.status(200).json(formattedTransactions);
        } catch (error) {
            console.error('Error fetching pending transactions:', error);
            return res.status(500).json({ error: 'Failed to fetch pending transactions' });
        }
    });

    // Handle all other routes with Next.js
    server.all('*', (req, res) => {
        return handle(req, res);
    });

    server.listen(3000, (err) => {
        if (err) throw err;
        console.log('> Ready on http://localhost:3000');
    });
}); 