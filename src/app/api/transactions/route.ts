import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const transaction = await prisma.transaction.create({
            data: {
                from: body.from,
                to: body.to,
                amount: body.amount,
                status: body.status,
                type: body.type,
            },
        });
        return NextResponse.json(transaction);
    } catch (error) {
        console.error('Error creating transaction:', error);
        return NextResponse.json(
            { error: 'Failed to create transaction' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const transactions = await prisma.transaction.findMany({
            orderBy: {
                timestamp: 'desc',
            },
        });
        return NextResponse.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transactions' },
            { status: 500 }
        );
    }
} 