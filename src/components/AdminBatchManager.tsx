import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { getBatches, submitBatchWithMerkleRoot, verifyBatch, finalizeBatch, isAdmin, getBatchTransactions, getContract } from "@/lib/ethers";
import { useWallet } from "@/hooks/useWallet";
import { createMerkleTreeFromTransactions, Transaction } from "@/lib/merkleTree";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ChevronDown, ChevronRight, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { BatchDetails } from './BatchDetails';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatEther } from 'ethers';
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
    isOperator?: boolean;
}

export default function AdminBatchManager({ isAdmin, isOperator = false }: AdminBatchManagerProps) {
    const { address, isConnected } = useWallet();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
    const [merkleRoot, setMerkleRoot] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>("all");
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
                if (!contract) {
                    throw new Error('Failed to get contract instance');
                }

                // Get the next batch ID from the contract
                const nextBatchId = await contract.nextBatchId();
                // Calculate the current batch ID (nextBatchId - 1)
                const currentBatchId = nextBatchId - 1n;

                const enrichedBatches = await Promise.all(dbBatches.map(async (batch: Batch) => {
                    try {
                        // Use the numeric batch ID for contract interaction
                        const batchData = await contract.batches(currentBatchId);
                        const isVerified = batchData.verified;
                        const isFinalized = batchData.finalized;

                        // Don't automatically update the database - let the user verify the batch manually
                        // This ensures batches start in a pending state and only get marked as verified when explicitly verified

                        return {
                            ...batch,
                            verified: isVerified,
                            finalized: isFinalized
                        };
                    } catch (err) {
                        console.warn(`Failed to get on-chain data for batch ${batch.id}:`, err);
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
        if (!address || (!isAdmin && !isOperator)) {
            toast({
                title: "Error",
                description: "You need admin or operator privileges to submit batches",
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
        if (!address) {
            toast({
                title: "Error",
                description: "Please connect your wallet first",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const contract = await getContract();
            if (!contract) {
                throw new Error('Failed to get contract instance');
            }

            // Get the numeric batch ID from the contract
            const nextBatchId = await contract.nextBatchId();
            // Calculate the current batch ID (nextBatchId - 1)
            const numericBatchId = nextBatchId - 1n;

            // Verify the batch on the contract using the numeric ID
            const tx = await contract.verifyBatch(numericBatchId);
            await tx.wait();

            // Update the database using the UUID
            const response = await fetch('http://localhost:5500/api/batches/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-address': address
                },
                body: JSON.stringify({ batchId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update batch status in database');
            }

            toast({
                title: "Success",
                description: "Batch verified successfully",
            });

            // Refresh batches
            await fetchBatches();
        } catch (error) {
            console.error('Error verifying batch:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : 'Failed to verify batch',
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinalizeBatch = async (batchId: string) => {
        try {
            if (!address) {
                toast({
                    title: "Error",
                    description: "Please connect your wallet first",
                    variant: "destructive",
                });
                return;
            }

            const contract = await getContract();
            if (!contract) {
                throw new Error('Failed to get contract instance');
            }

            // Get the numeric batch ID from the contract
            const nextBatchId = await contract.nextBatchId();
            // Calculate the current batch ID (nextBatchId - 1)
            const numericBatchId = nextBatchId - 1n;

            // Finalize the batch on the contract using the numeric ID
            const tx = await contract.finalizeBatch(numericBatchId);
            await tx.wait();

            // Update the database using the UUID
            const response = await fetch('http://localhost:5500/api/batches/finalize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-address': address
                },
                body: JSON.stringify({ batchId }),
            });

            if (!response.ok) {
                throw new Error('Failed to update batch status in database');
            }

            toast({
                title: "Success",
                description: "Batch finalized successfully",
            });
            fetchBatches();
        } catch (error) {
            console.error('Error finalizing batch:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : 'Failed to finalize batch',
                variant: "destructive",
            });
        }
    };

    const handleRejectBatch = async (batchId: string) => {
        if (!address) {
            toast({
                title: "Error",
                description: "Please connect your wallet first",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            // Update the database to reject the batch
            const response = await fetch('http://localhost:5500/api/batches/reject', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-address': address
                },
                body: JSON.stringify({ batchId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to reject batch');
            }

            toast({
                title: "Success",
                description: "Batch rejected successfully",
            });

            // Refresh batches
            await fetchBatches();
        } catch (error) {
            console.error('Error rejecting batch:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : 'Failed to reject batch',
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (batch: Batch) => {
        if (batch.finalized) {
            return <Badge variant="default" className="flex items-center gap-1"><CheckCircle size={14} /> Finalized</Badge>;
        }
        if (batch.verified) {
            return <Badge variant="secondary" className="flex items-center gap-1"><Clock size={14} /> In Challenge Period</Badge>;
        }
        return <Badge variant="outline" className="flex items-center gap-1"><AlertTriangle size={14} /> Pending</Badge>;
    };

    const formatTimestamp = (timestamp: Date) => {
        return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    };

    const toggleBatchDetails = (batchId: string) => {
        if (expandedBatchId === batchId) {
            setExpandedBatchId(null);
        } else {
            setExpandedBatchId(batchId);
        }
    };

    const filteredBatches = () => {
        switch (activeTab) {
            case "pending":
                return batches.filter(batch => !batch.verified && !batch.finalized);
            case "verified":
                return batches.filter(batch => batch.verified && !batch.finalized);
            case "finalized":
                return batches.filter(batch => batch.finalized);
            default:
                return batches;
        }
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

    if (isLoading && batches.length === 0) {
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

    return (
        <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
            <CardHeader>
                <CardTitle className="text-2xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                    Batch Management
                </CardTitle>
                <CardDescription className="text-white/70">
                    {isAdmin ? "Manage and verify network batches" : isOperator ? "Operate and verify network batches" : "View network batches"}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {(isAdmin || isOperator) && (
                        <Button
                            onClick={handleSubmitBatch}
                            disabled={isLoading}
                            className="w-full bg-purple-500 hover:bg-purple-600"
                        >
                            Submit New Batch
                        </Button>
                    )}

                    <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
                        <TabsList className="grid grid-cols-4 mb-4">
                            <TabsTrigger value="all">All Batches</TabsTrigger>
                            <TabsTrigger value="pending">Pending</TabsTrigger>
                            <TabsTrigger value="verified">In Challenge</TabsTrigger>
                            <TabsTrigger value="finalized">Finalized</TabsTrigger>
                        </TabsList>

                        <TabsContent value="all" className="mt-0">
                            {renderBatchTable(filteredBatches())}
                        </TabsContent>
                        <TabsContent value="pending" className="mt-0">
                            {renderBatchTable(filteredBatches())}
                        </TabsContent>
                        <TabsContent value="verified" className="mt-0">
                            {renderBatchTable(filteredBatches())}
                        </TabsContent>
                        <TabsContent value="finalized" className="mt-0">
                            {renderBatchTable(filteredBatches())}
                        </TabsContent>
                    </Tabs>
                </div>
            </CardContent>
        </Card>
    );

    function renderBatchTable(batchesToRender: Batch[]) {
        if (batchesToRender.length === 0) {
            return (
                <div className="text-center py-8 text-white/70">
                    No batches found in this category
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {batchesToRender.map((batch) => (
                    <Collapsible
                        key={batch.id}
                        open={expandedBatchId === batch.id}
                        onOpenChange={() => toggleBatchDetails(batch.id)}
                        className="border border-white/10 rounded-lg overflow-hidden"
                    >
                        <div className="p-4 bg-white/5">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
                                            {expandedBatchId === batch.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </Button>
                                    </CollapsibleTrigger>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">
                                            Batch #{batch.batchId}
                                        </h3>
                                        <p className="text-sm text-white/70">
                                            Root: {batch.transactionsRoot.slice(0, 10)}...{batch.transactionsRoot.slice(-8)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex gap-2">
                                        {getStatusBadge(batch)}
                                    </div>
                                    <div className="flex gap-2">
                                        {!batch.verified && (isAdmin || isOperator) && (
                                            <Button
                                                onClick={() => handleVerifyBatch(batch.batchId)}
                                                disabled={isLoading}
                                                className="bg-green-500 hover:bg-green-600"
                                            >
                                                Verify
                                            </Button>
                                        )}
                                        {batch.verified && !batch.finalized && (isAdmin || isOperator) && (
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
                        </div>

                        <CollapsibleContent>
                            <div className="p-4 bg-white/5 border-t border-white/10">
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <h4 className="text-sm font-medium text-white/70">Batch Details</h4>
                                        <div className="mt-2 space-y-1">
                                            <p className="text-sm text-white"><span className="text-white/70">ID:</span> {batch.batchId}</p>
                                            <p className="text-sm text-white"><span className="text-white/70">Merkle Root:</span> {batch.transactionsRoot}</p>
                                            <p className="text-sm text-white"><span className="text-white/70">Timestamp:</span> {formatTimestamp(new Date(batch.timestamp))}</p>
                                            <p className="text-sm text-white"><span className="text-white/70">Transactions:</span> {batch.transactions.length}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-white/70">Status</h4>
                                        <div className="mt-2 space-y-1">
                                            <p className="text-sm text-white">
                                                <span className="text-white/70">Verified:</span> {batch.verified ? "Yes" : "No"}
                                            </p>
                                            <p className="text-sm text-white">
                                                <span className="text-white/70">Finalized:</span> {batch.finalized ? "Yes" : "No"}
                                            </p>
                                            <p className="text-sm text-white">
                                                <span className="text-white/70">Challenge Period:</span> {batch.verified && !batch.finalized ? "Active" : "Not Active"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <h4 className="text-md font-semibold text-white mb-2">Transactions</h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>From</TableHead>
                                            <TableHead>To</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Timestamp</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {batch.transactions.map((tx, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-mono text-sm">
                                                    {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                                                </TableCell>
                                                <TableCell>{tx.value} ETH</TableCell>
                                                <TableCell>
                                                    <Badge variant={tx.status === 'pending' ? 'outline' : 'default'}>
                                                        {tx.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(tx.timestamp * 1000).toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                ))}
            </div>
        );
    }
} 