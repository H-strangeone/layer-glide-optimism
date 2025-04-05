const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Starting database seeding...');

    try {
        // Create some batches
        console.log('Creating batches...');
        const batch1 = await prisma.batch.upsert({
            where: { batchId: '1' },
            update: {
                transactionsRoot: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                verified: false,
                finalized: false,
                rejected: false,
                updatedAt: new Date()
            },
            create: {
                batchId: '1',
                transactionsRoot: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                verified: false,
                finalized: false,
                rejected: false,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        const batch2 = await prisma.batch.upsert({
            where: { batchId: '2' },
            update: {
                transactionsRoot: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                verified: true,
                finalized: true,
                rejected: false,
                updatedAt: new Date()
            },
            create: {
                batchId: '2',
                transactionsRoot: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                verified: true,
                finalized: true,
                rejected: false,
                createdAt: new Date(Date.now() - 86400000), // 1 day ago
                updatedAt: new Date()
            }
        });

        console.log('Created/Updated batches:', batch1.id, batch2.id);

        // Create some transactions
        console.log('Creating transactions...');
        const tx1 = await prisma.batchTransaction.upsert({
            where: {
                id: 'tx1',
                batchId: batch1.batchId
            },
            update: {
                from: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
                to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
                value: '1000000000000000000',
                status: 'pending',
                updatedAt: new Date()
            },
            create: {
                id: 'tx1',
                from: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
                to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
                value: '1000000000000000000',
                status: 'pending',
                batchId: batch1.batchId,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        const tx2 = await prisma.batchTransaction.upsert({
            where: {
                id: 'tx2',
                batchId: batch2.batchId
            },
            update: {
                from: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
                to: '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
                value: '500000000000000000',
                status: 'verified',
                updatedAt: new Date()
            },
            create: {
                id: 'tx2',
                from: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
                to: '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
                value: '500000000000000000',
                status: 'verified',
                batchId: batch2.batchId,
                createdAt: new Date(Date.now() - 86400000), // 1 day ago
                updatedAt: new Date()
            }
        });

        console.log('Created/Updated transactions:', tx1.id, tx2.id);

        // Create some operators
        console.log('Creating operators...');
        const operator1 = await prisma.operator.upsert({
            where: { address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266' },
            update: {
                isActive: true,
                updatedAt: new Date()
            },
            create: {
                address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        const operator2 = await prisma.operator.upsert({
            where: { address: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8' },
            update: {
                isActive: true,
                updatedAt: new Date()
            },
            create: {
                address: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
                isActive: true,
                createdAt: new Date(Date.now() - 86400000), // 1 day ago
                updatedAt: new Date()
            }
        });

        console.log('Created/Updated operators:', operator1.id, operator2.id);

        // Create some Layer2Balances
        console.log('Creating Layer2Balances...');
        const balance1 = await prisma.layer2Balance.upsert({
            where: {
                userAddress_contractAddress: {
                    userAddress: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
                    contractAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
                }
            },
            update: {
                balance: '10000000000000000000', // 10 ETH
                updatedAt: new Date()
            },
            create: {
                userAddress: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
                contractAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
                balance: '10000000000000000000', // 10 ETH
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        const balance2 = await prisma.layer2Balance.upsert({
            where: {
                userAddress_contractAddress: {
                    userAddress: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
                    contractAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
                }
            },
            update: {
                balance: '5000000000000000000', // 5 ETH
                updatedAt: new Date()
            },
            create: {
                userAddress: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
                contractAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
                balance: '5000000000000000000', // 5 ETH
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        console.log('Created/Updated Layer2Balances:', balance1.id, balance2.id);

        // Create a contract deployment
        console.log('Creating contract deployment...');
        const deployment = await prisma.contractDeployment.upsert({
            where: { address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' },
            update: {
                network: 'localhost',
                isActive: true,
                updatedAt: new Date()
            },
            create: {
                address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
                network: 'localhost',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        console.log('Created/Updated contract deployment:', deployment.id);

        // Create some Balance records
        console.log('Creating Balance records...');
        const userBalance1 = await prisma.balance.upsert({
            where: { address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266' },
            update: {
                layer1Balance: '9959.992619428907001299',
                layer2Balance: '32.0',
                lastUpdated: new Date(),
                updatedAt: new Date()
            },
            create: {
                address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
                layer1Balance: '9959.992619428907001299',
                layer2Balance: '32.0',
                lastUpdated: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        const userBalance2 = await prisma.balance.upsert({
            where: { address: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8' },
            update: {
                layer1Balance: '9999.5',
                layer2Balance: '10.0',
                lastUpdated: new Date(),
                updatedAt: new Date()
            },
            create: {
                address: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
                layer1Balance: '9999.5',
                layer2Balance: '10.0',
                lastUpdated: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        console.log('Created/Updated Balance records:', userBalance1.id, userBalance2.id);

        console.log('Database seeding completed successfully!');
    } catch (error) {
        console.error('Error during seeding:', error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 