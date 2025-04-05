"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { formatEther } from "ethers";

interface Transaction {
    hash: string;
    from: string;
    to: string;
    value: string;
    status: string;
    timestamp: number;
    batchId?: string;
    type?: string;
    isInBatch: boolean;
}

export default function TransactionsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [networkTransactions, setNetworkTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        const fetchNetworkTransactions = async () => {
            try {
                const response = await fetch('http://localhost:5500/api/transactions/network');
                if (!response.ok) {
                    throw new Error('Failed to fetch network transactions');
                }
                const data = await response.json();
                setNetworkTransactions(data);
                setError(null);
            } catch (err) {
                console.error('Error fetching network transactions:', err);
                setError('Failed to load network transactions');
            } finally {
                setLoading(false);
            }
        };

        fetchNetworkTransactions();

        // Refresh every 30 seconds
        const interval = setInterval(fetchNetworkTransactions, 30000);
        return () => clearInterval(interval);
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending':
                return <Badge variant="secondary">Pending</Badge>;
            case 'completed':
            case 'confirmed':
            case 'verified':
                return <Badge variant="default">Completed</Badge>;
            case 'failed':
            case 'rejected':
                return <Badge variant="destructive">Failed</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getTypeBadge = (type: string, isInBatch: boolean) => {
        if (isInBatch) {
            return <Badge variant="secondary">Batch</Badge>;
        }
        switch (type.toLowerCase()) {
            case "deposit":
                return <Badge variant="default">Deposit</Badge>;
            case "withdrawal":
                return <Badge variant="outline">Withdrawal</Badge>;
            default:
                return <Badge variant="outline">Transfer</Badge>;
        }
    };

    const formatTimestamp = (timestamp: number) => {
        return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
    };

    return (
        <div className="container mx-auto py-8 space-y-8">
            <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
                <CardHeader>
                    <CardTitle className="text-2xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                        Network Transactions
                    </CardTitle>
                    <CardDescription className="text-white/70">
                        View all transactions on the network
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                            <p className="mt-2 text-white/70">Loading transactions...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-400">
                            {error}
                        </div>
                    ) : networkTransactions.length === 0 ? (
                        <div className="text-center py-8 text-white/70">
                            No transactions found
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>From</TableHead>
                                        <TableHead>To</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Batch</TableHead>
                                        <TableHead>Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {networkTransactions.map((tx, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{getTypeBadge(tx.type || 'transfer', tx.isInBatch)}</TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {tx.from.substring(0, 6)}...{tx.from.substring(tx.from.length - 4)}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {tx.to.substring(0, 6)}...{tx.to.substring(tx.to.length - 4)}
                                            </TableCell>
                                            <TableCell>
                                                {(() => {
                                                    try {
                                                        // Check if the value is a valid number string
                                                        if (tx.value && !isNaN(Number(tx.value))) {
                                                            // If it's a decimal string, just display it directly
                                                            if (tx.value.includes('.')) {
                                                                return `${tx.value} ETH`;
                                                            }
                                                            // Otherwise use formatEther
                                                            return `${formatEther(tx.value)} ETH`;
                                                        }
                                                        return '0 ETH';
                                                    } catch (error) {
                                                        console.error('Error formatting value:', error);
                                                        return '0 ETH';
                                                    }
                                                })()}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(tx.status)}</TableCell>
                                            <TableCell>{tx.batchId || '-'}</TableCell>
                                            <TableCell>{formatTimestamp(tx.timestamp)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 