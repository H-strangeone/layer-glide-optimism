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
    gasPrice?: string;
    timestamp: number;
    batchId?: string;
    type?: string;
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
            const transactionsResponse = await fetch('http://localhost:5500/api/transactions');
            if (!transactionsResponse.ok) {
                throw new Error('Failed to fetch transactions');
            }
            const transactionsData = await transactionsResponse.json();
            setTransactions(transactionsData);
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

        // Set up polling to refresh data every 30 seconds
        const intervalId = setInterval(fetchNetworkData, 30000);

        return () => clearInterval(intervalId);
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

    const formatTimestamp = (timestamp: number) => {
        return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
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

    return (
        <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
            <CardHeader>
                <CardTitle className="text-xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                    Network Transaction History
                </CardTitle>
                <CardDescription className="text-white/70">
                    View all transactions and batches on the network
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                        <p className="mt-2 text-white/70">Loading network data...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-8 text-red-400">
                        {error}
                    </div>
                ) : (
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
                                                <TableRow key={index}>
                                                    <TableCell>{getTransactionType(tx.type || 'transfer')}</TableCell>
                                                    <TableCell className="font-mono text-xs">
                                                        {tx.from.substring(0, 6)}...{tx.from.substring(tx.from.length - 4)}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs">
                                                        {tx.to.substring(0, 6)}...{tx.to.substring(tx.to.length - 4)}
                                                    </TableCell>
                                                    <TableCell>{formatEther(tx.value)} ETH</TableCell>
                                                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
                                                    <TableCell>{tx.batchId || '-'}</TableCell>
                                                    <TableCell>{formatTimestamp(tx.timestamp)}</TableCell>
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
                                                <TableHead>Size</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Time</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {batches.map((batch, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-mono text-xs">
                                                        {batch.id.substring(0, 8)}...{batch.id.substring(batch.id.length - 4)}
                                                    </TableCell>
                                                    <TableCell>{batch.size} tx</TableCell>
                                                    <TableCell>{getStatusBadge(batch.status)}</TableCell>
                                                    <TableCell>{formatTimestamp(batch.timestamp)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </CardContent>
        </Card>
    );
} 