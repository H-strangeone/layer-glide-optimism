import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Starting database seeding...');

    // Create a contract deployment
    const contractDeployment = await prisma.contractDeployment.upsert({
        where: { address: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707' },
        update: {},
        create: {
            address: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
            network: 'localhost',
            isActive: true,
        },
    });

    console.log(`Created contract deployment: ${contractDeployment.address}`);

    // Create some initial balances
    const balances = [
        {
            userAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
            contractAddress: contractDeployment.address,
            balance: '10.0',
        },
        {
            userAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
            contractAddress: contractDeployment.address,
            balance: '5.0',
        },
    ];

    for (const balance of balances) {
        const createdBalance = await prisma.layer2Balance.upsert({
            where: {
                userAddress_contractAddress: {
                    userAddress: balance.userAddress,
                    contractAddress: balance.contractAddress,
                },
            },
            update: { balance: balance.balance },
            create: balance,
        });
        console.log(`Created balance for ${createdBalance.userAddress}: ${createdBalance.balance}`);
    }

    // Create some initial batches
    const batches = [
        {
            batchId: '1',
            transactionsRoot: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            timestamp: new Date(),
            verified: true,
            finalized: false,
        },
        {
            batchId: '2',
            transactionsRoot: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            timestamp: new Date(),
            verified: false,
            finalized: false,
        },
    ];

    for (const batch of batches) {
        const createdBatch = await prisma.batch.upsert({
            where: { batchId: batch.batchId },
            update: {},
            create: batch,
        });
        console.log(`Created batch: ${createdBatch.batchId}`);

        // Create some transactions for each batch
        const transactions = [
            {
                id: `${batch.batchId}-0x70997970C51812dc3A010C7d01b50e0d17dc79C8-0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC-1.0`,
                batchId: createdBatch.id,
                from: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
                to: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
                value: '1.0',
                status: 'confirmed',
                timestamp: new Date(),
            },
            {
                id: `${batch.batchId}-0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC-0x70997970C51812dc3A010C7d01b50e0d17dc79C8-0.5`,
                batchId: createdBatch.id,
                from: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
                to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
                value: '0.5',
                status: 'confirmed',
                timestamp: new Date(),
            },
        ];

        for (const transaction of transactions) {
            const createdTransaction = await prisma.batchTransaction.upsert({
                where: { id: transaction.id },
                update: {},
                create: transaction,
            });
            console.log(`Created transaction: ${createdTransaction.id}`);
        }
    }

    console.log('Database seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 