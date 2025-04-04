import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const pendingTransactions = await prisma.transaction.findMany({
            where: {
                status: 'pending'
            },
            orderBy: {
                timestamp: 'asc'
            }
        });

        return NextResponse.json(pendingTransactions);
    } catch (error) {
        console.error('Error fetching pending transactions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch pending transactions' },
            { status: 500 }
        );
    }
} 