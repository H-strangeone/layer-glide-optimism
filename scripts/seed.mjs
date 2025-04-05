const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Add test operators
    const operators = [
        { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' },
        { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' },
        { address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' }
    ];

    for (const operator of operators) {
        await prisma.operator.upsert({
            where: { address: operator.address },
            update: {},
            create: operator
        });
    }

    // Add test batches with transactions
    const batch1 = await prisma.batch.create({
        data: {
            batchId: '1',
            transactionsRoot: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            transactions: {
                create: [
                    {
                        from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
                        to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
                        value: '1000000000000000000',
                        status: 'completed'
                    },
                    {
                        from: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
                        to: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
                        value: '500000000000000000',
                        status: 'completed'
                    }
                ]
            }
        }
    });

    const batch2 = await prisma.batch.create({
        data: {
            batchId: '2',
            transactionsRoot: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            verified: true,
            transactions: {
                create: [
                    {
                        from: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
                        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
                        value: '2000000000000000000',
                        status: 'completed'
                    }
                ]
            }
        }
    });

    console.log('Database seeded!');
    console.log('Added operators:', operators.length);
    console.log('Added batches:', 2);
    console.log('Added transactions:', 3);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 