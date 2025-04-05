import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ethers } from 'ethers';

interface Batch {
    id: string;
    batchId: string;
    transactionsRoot: string;
    verified: boolean;
    finalized: boolean;
    rejected: boolean;
    rejectionReason?: string;
    createdAt: string;
    transactions: Transaction[];
}

interface Transaction {
    id: string;
    from: string;
    to: string;
    value: string;
    status: string;
    batchId: string | null;
    createdAt: string;
}

export function BatchManager() {
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5500/api/batches');
            if (!response.ok) {
                throw new Error('Failed to fetch batches');
            }
            const data = await response.json();
            setBatches(data);
        } catch (error) {
            console.error('Error fetching batches:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch batches',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const createBatch = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5500/api/rollup/batch/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to create batch');
            }

            const result = await response.json();

            if (result.success) {
                toast({
                    title: 'Success',
                    description: `Created batch with ${result.transactionCount} transactions`,
                });
                fetchBatches();
            } else {
                toast({
                    title: 'Error',
                    description: result.message || 'Failed to create batch',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error creating batch:', error);
            toast({
                title: 'Error',
                description: 'Failed to create batch',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const verifyBatch = async (batchId: string) => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5500/api/rollup/batch/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ batchId }),
            });

            if (!response.ok) {
                throw new Error('Failed to verify batch');
            }

            const result = await response.json();

            if (result.success) {
                toast({
                    title: 'Success',
                    description: 'Batch verified successfully',
                });
                fetchBatches();
            } else {
                toast({
                    title: 'Error',
                    description: result.message || 'Failed to verify batch',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error verifying batch:', error);
            toast({
                title: 'Error',
                description: 'Failed to verify batch',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const finalizeBatch = async (batchId: string) => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5500/api/rollup/batch/finalize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ batchId }),
            });

            if (!response.ok) {
                throw new Error('Failed to finalize batch');
            }

            const result = await response.json();

            if (result.success) {
                toast({
                    title: 'Success',
                    description: 'Batch finalized successfully',
                });
                fetchBatches();
            } else {
                toast({
                    title: 'Error',
                    description: result.message || 'Failed to finalize batch',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error finalizing batch:', error);
            toast({
                title: 'Error',
                description: 'Failed to finalize batch',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (batch: Batch) => {
        if (batch.rejected) {
            return <Badge variant="destructive">Rejected</Badge>;
        }
        if (batch.finalized) {
            return <Badge variant="success">Finalized</Badge>;
        }
        if (batch.verified) {
            return <Badge variant="warning">Verified</Badge>;
        }
        return <Badge variant="outline">Pending</Badge>;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const formatEther = (wei: string) => {
        try {
            return ethers.utils.formatEther(wei);
        } catch (error) {
            return wei;
        }
    };

    return (
        <div className="container mx-auto py-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Batch Manager</h1>
                <Button onClick={createBatch} disabled={loading}>
                    {loading ? 'Processing...' : 'Create New Batch'}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Batches</CardTitle>
                    <CardDescription>Manage transaction batches</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Batch ID</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Transactions</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {batches.map((batch) => (
                                <TableRow key={batch.id}>
                                    <TableCell className="font-mono">{batch.batchId}</TableCell>
                                    <TableCell>{getStatusBadge(batch)}</TableCell>
                                    <TableCell>{batch.transactions.length}</TableCell>
                                    <TableCell>{formatDate(batch.createdAt)}</TableCell>
                                    <TableCell>
                                        <div className="flex space-x-2">
                                            {!batch.verified && !batch.rejected && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => verifyBatch(batch.batchId)}
                                                    disabled={loading}
                                                >
                                                    Verify
                                                </Button>
                                            )}
                                            {batch.verified && !batch.finalized && !batch.rejected && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => finalizeBatch(batch.batchId)}
                                                    disabled={loading}
                                                >
                                                    Finalize
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {batches.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4">
                                        No batches found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
} 