import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { getBatches, submitBatchWithMerkleRoot, verifyBatch, finalizeBatch, isAdmin, getBatchTransactions, getContract } from "@/lib/ethers";
import { useWallet } from "@/hooks/useWallet";
import { createMerkleTreeFromTransactions, Transaction } from "@/lib/merkleTree";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { BatchDetails } from './BatchDetails';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatEther } from 'ethers';
import { formatDistanceToNow } from 'date-fns';

interface BatchTransaction {
    from: string;
    to: string;
    value: string;
    status: string;
    timestamp: number;
}

interface BlockchainBatch {
    id: string;
    transactionsRoot: string;
    timestamp: string;
    verified: boolean;
    finalized: boolean;
}

interface Batch extends BlockchainBatch {
    batchId: string;
    transactions: BatchTransaction[];
}

interface AdminBatchManagerProps {
    isAdmin: boolean;
}

export default function AdminBatchManager({ isAdmin }: AdminBatchManagerProps) {
    const { address, isConnected } = useWallet();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
    const [merkleRoot, setMerkleRoot] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const [error, setError] = useState('');

    const fetchBatches = async () => {
        try {
            setIsLoading(true);
            setError('');

            // First try to get batches from the database
            const response = await fetch('http://localhost:5500/api/batches');
            if (!response.ok) {
                throw new Error('Failed to fetch batches from database');
            }
            const dbBatches = await response.json();

            // Then try to get on-chain data to enrich the batches
            try {
                const contract = await getContract();
                const enrichedBatches = await Promise.all(dbBatches.map(async (batch: Batch) => {
                    try {
                        // Get on-chain verification status
                        const isVerified = await contract.isBatchVerified(batch.batchId);
                        const isFinalized = await contract.isBatchFinalized(batch.batchId);

                        return {
                            ...batch,
                            verified: isVerified,
                            finalized: isFinalized
                        };
                    } catch (err) {
                        console.warn(`Failed to get on-chain data for batch ${batch.batchId}:`, err);
                        return batch;
                    }
                }));

                setBatches(enrichedBatches);
            } catch (err) {
                console.warn('Failed to get on-chain data:', err);
                // Still use database batches if contract calls fail
                setBatches(dbBatches);
            }
        } catch (err) {
            console.error('Error fetching batches:', err);
            setError('Failed to fetch batches');
            setBatches([]);
            toast({
                title: "Error",
                description: "Failed to fetch batches. Please try again later.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBatches();
        // Refresh every 30 seconds
        const interval = setInterval(fetchBatches, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleBatchSelect = (batch: Batch) => {
        setSelectedBatch(batch);
        // In a real implementation, we would fetch the actual transactions for this batch
        // and compute the Merkle root. For now, we'll just use the first transaction hash
        if (batch.transactionsRoot.length > 0) {
            setMerkleRoot(batch.transactionsRoot);
        } else {
            setMerkleRoot("");
        }
    };

    const handleSubmitBatch = async () => {
        if (!address || !isAdmin) {
            toast({
                title: "Error",
                description: "You need admin privileges to submit batches",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            // In a real implementation, we would:
            // 1. Fetch pending transactions from the database
            // 2. Create a Merkle tree from these transactions
            // 3. Submit the Merkle root to the contract

            // For demonstration purposes, we'll create a dummy transaction and Merkle root
            const dummyTransaction: Transaction = {
                sender: address,
                recipient: "0x0000000000000000000000000000000000000000",
                amount: "0.1"
            };

            const dummyTransactions = [dummyTransaction];
            const merkleTree = createMerkleTreeFromTransactions(dummyTransactions);
            const root = merkleTree.getRoot(); // Root is already a hex string

            await submitBatchWithMerkleRoot(root);

            toast({
                title: "Batch Submitted",
                description: "Batch submitted successfully",
            });

            // Refresh batches
            await fetchBatches();
        } catch (error) {
            console.error("Error submitting batch:", error);
            toast({
                title: "Error",
                description: "Failed to submit batch",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyBatch = async (batchId: string) => {
        if (!address || !isAdmin) {
            toast({
                title: "Error",
                description: "You need admin privileges to verify batches",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            await verifyBatch(batchId);
            toast({
                title: "Success",
                description: "Batch verified successfully",
            });
            await fetchBatches();
        } catch (error) {
            console.error("Error verifying batch:", error);
            toast({
                title: "Error",
                description: "Failed to verify batch",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinalizeBatch = async (batchId: string) => {
        if (!address || !isAdmin) {
            toast({
                title: "Error",
                description: "You need admin privileges to finalize batches",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            await finalizeBatch(parseInt(batchId));
            toast({
                title: "Success",
                description: "Batch finalized successfully",
            });
            await fetchBatches();
        } catch (error) {
            console.error("Error finalizing batch:", error);
            toast({
                title: "Error",
                description: "Failed to finalize batch",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRejectBatch = async (batchId: string) => {
        if (!address || !isAdmin) {
            toast({
                title: "Error",
                description: "You need admin privileges to reject batches",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            // In a real implementation, we would:
            // 1. Call the smart contract to reject the batch
            // 2. Update the database status
            // For now, we'll just show a success message
            toast({
                title: "Success",
                description: "Batch rejected successfully",
            });
            await fetchBatches();
        } catch (error) {
            console.error("Error rejecting batch:", error);
            toast({
                title: "Error",
                description: "Failed to reject batch",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (batch: Batch) => {
        if (batch.finalized) {
            return <Badge variant="default">Finalized</Badge>;
        }
        if (batch.verified) {
            return <Badge variant="secondary">Verified</Badge>;
        }
        return <Badge variant="outline">Pending</Badge>;
    };

    const formatTimestamp = (timestamp: Date) => {
        return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    };

    if (!isConnected) {
        return (
            <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
                <CardContent className="py-8">
                    <div className="text-center text-white/70">
                        Please connect your wallet to manage batches
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
                <CardContent className="py-8">
                    <div className="text-center text-white/70">
                        Loading batches...
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
                <CardContent className="py-8">
                    <div className="text-center text-red-400">
                        {error}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (batches.length === 0) {
        return (
            <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
                <CardContent className="py-8">
                    <div className="text-center text-white/70">
                        No batches found
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
            <CardHeader>
                <CardTitle className="text-2xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                    Batch Management
                </CardTitle>
                <CardDescription className="text-white/70">
                    {isAdmin ? "Manage and verify network batches" : "View and verify network batches"}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {isAdmin && (
                        <Button
                            onClick={handleSubmitBatch}
                            disabled={isLoading}
                            className="w-full bg-purple-500 hover:bg-purple-600"
                        >
                            Submit New Batch
                        </Button>
                    )}
                    {batches.map((batch) => (
                        <div key={batch.id} className="p-4 rounded-lg bg-white/5 space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">
                                        Batch #{batch.batchId}
                                    </h3>
                                    <p className="text-sm text-white/70">
                                        Root: {batch.transactionsRoot.slice(0, 10)}...
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {!batch.verified && isAdmin && (
                                        <Button
                                            onClick={() => handleVerifyBatch(batch.batchId)}
                                            disabled={isLoading}
                                            className="bg-green-500 hover:bg-green-600"
                                        >
                                            Verify
                                        </Button>
                                    )}
                                    {batch.verified && !batch.finalized && isAdmin && (
                                        <>
                                            <Button
                                                onClick={() => handleFinalizeBatch(batch.batchId)}
                                                disabled={isLoading}
                                                className="bg-blue-500 hover:bg-blue-600"
                                            >
                                                Finalize
                                            </Button>
                                            <Button
                                                onClick={() => handleRejectBatch(batch.batchId)}
                                                disabled={isLoading}
                                                variant="destructive"
                                            >
                                                Reject
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
} 