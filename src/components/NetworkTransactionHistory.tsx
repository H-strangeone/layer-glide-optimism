import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { formatEther } from "ethers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define interfaces
interface Transaction {
    hash: string;
    from: string;
    to: string;
    value: string;
    status: string;
    createdAt: number;
    batchId?: string;
    type?: string;
    isInBatch?: boolean;
}

interface Batch {
    id: string;
    status: string;
    transactions: Transaction[];
    timestamp: number;
    size: number;
}

export function NetworkTransactionHistory() {
    const [batches, setBatches] = useState<Batch[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { toast } = useToast();

    const fetchNetworkData = async () => {
        try {
            setLoading(true);

            // Fetch batches
            const batchesResponse = await fetch('http://localhost:5500/api/batches');
            if (!batchesResponse.ok) {
                throw new Error('Failed to fetch batches');
            }
            const batchesData = await batchesResponse.json();
            setBatches(batchesData);

            // Fetch all transactions
            const transactionsResponse = await fetch('http://localhost:5500/api/transactions/network');
            if (!transactionsResponse.ok) {
                throw new Error('Failed to fetch transactions');
            }
            const transactionsData = await transactionsResponse.json();
            setTransactions(transactionsData);
            setError('');
        } catch (error) {
            console.error("Error fetching network data:", error);
            setError('Failed to fetch network data');
            toast({
                title: "Error",
                description: "Failed to fetch network transaction history",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNetworkData();

        // Set up polling to refresh data every 10 seconds
        const intervalId = setInterval(fetchNetworkData, 10000);

        return () => clearInterval(intervalId);
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending':
                return <Badge variant="secondary">Pending</Badge>;
            case 'verified':
            case 'finalized':
                return <Badge variant="default">Completed</Badge>;
            case 'rejected':
                return <Badge variant="destructive">Failed</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getTransactionType = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'deposit':
                return 'Deposit';
            case 'withdrawal':
                return 'Withdrawal';
            case 'transfer':
            default:
                return 'Transfer';
        }
    };

    if (loading && transactions.length === 0) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-red-500">
                <p>{error}</p>
            </div>
        );
    }

    return (
        <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
            <CardHeader>
                <CardTitle className="text-2xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                    Network Activity
                </CardTitle>
                <CardDescription className="text-white/70">
                    Live transaction and batch history
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="transactions" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="transactions">Transactions</TabsTrigger>
                        <TabsTrigger value="batches">Batches</TabsTrigger>
                    </TabsList>

                    <TabsContent value="transactions">
                        {transactions.length === 0 ? (
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
                                        {transactions.map((tx, index) => (
                                            <TableRow key={tx.hash || index}>
                                                <TableCell>{getTransactionType(tx.type || 'transfer')}</TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {tx.from.substring(0, 6)}...{tx.from.substring(tx.from.length - 4)}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {tx.to.substring(0, 6)}...{tx.to.substring(tx.to.length - 4)}
                                                </TableCell>
                                                <TableCell>{formatEther(tx.value)} ETH</TableCell>
                                                <TableCell>{getStatusBadge(tx.status)}</TableCell>
                                                <TableCell>
                                                    {tx.batchId ? (
                                                        <span className="text-purple-400">#{tx.batchId}</span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {formatDistanceToNow(new Date(tx.createdAt * 1000), { addSuffix: true })}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="batches">
                        {batches.length === 0 ? (
                            <div className="text-center py-8 text-white/70">
                                No batches found
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Batch ID</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Transactions</TableHead>
                                            <TableHead>Time</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {batches.map((batch) => (
                                            <TableRow key={batch.id}>
                                                <TableCell className="font-mono text-xs">
                                                    {batch.id.substring(0, 8)}...
                                                </TableCell>
                                                <TableCell>{getStatusBadge(batch.status)}</TableCell>
                                                <TableCell>{batch.transactions.length}</TableCell>
                                                <TableCell>
                                                    {formatDistanceToNow(new Date(batch.timestamp * 1000), { addSuffix: true })}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
} 