import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const batches = await prisma.batch.findMany({
            orderBy: {
                batchId: 'desc'
            },
            include: {
                _count: {
                    select: { transactions: true }
                }
            }
        });

        const formattedBatches = batches.map(batch => ({
            id: batch.batchId,
            status: batch.status,
            transactionsRoot: batch.transactionsRoot,
            timestamp: batch.timestamp.getTime(),
            transactionCount: batch._count.transactions
        }));

        return NextResponse.json(formattedBatches);
    } catch (error) {
        console.error('Error fetching batches:', error);
        return NextResponse.json(
            { error: 'Failed to fetch batches' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const batch = await prisma.batch.create({
            data: {
                batchId: body.batchId,
                transactionsRoot: body.transactionsRoot,
                status: 'pending',
                transactions: {
                    connect: body.transactionIds.map((id: string) => ({ id }))
                }
            }
        });

        return NextResponse.json(batch);
    } catch (error) {
        console.error('Error creating batch:', error);
        return NextResponse.json(
            { error: 'Failed to create batch' },
            { status: 500 }
        );
    }
} 