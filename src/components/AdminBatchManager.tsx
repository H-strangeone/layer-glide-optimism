import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { getBatches, submitBatchWithMerkleRoot, verifyBatch, finalizeBatch, isAdmin, getBatchTransactions } from "@/lib/ethers";
import { useWallet } from "@/hooks/useWallet";
import { createMerkleTreeFromTransactions, Transaction } from "@/lib/merkleTree";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { BatchDetails } from './BatchDetails';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatEther } from 'ethers';

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

const AdminBatchManager = () => {
    const { address, isConnected } = useWallet();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
    const [merkleRoot, setMerkleRoot] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [isAdminUser, setIsAdminUser] = useState<boolean>(false);
    const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
    const { toast } = useToast();
    const [error, setError] = useState('');

    // Define fetchBatches function outside useEffect
    const fetchBatches = async () => {
        if (isConnected && isAdminUser) {
            try {
                setIsLoading(true);
                // Fetch batches from blockchain
                const blockchainBatches = await getBatches();

                try {
                    // Use the correct API endpoint URL with port 5500
                    const apiUrl = 'http://localhost:5500/api/batches';

                    console.log('Fetching batches from database at:', apiUrl);

                    // Fetch batches from database
                    const response = await fetch(apiUrl);

                    if (!response.ok) {
                        throw new Error(`Error fetching batches: ${response.status} ${response.statusText}`);
                    }

                    const dbBatches = await response.json();

                    // Merge blockchain and database data
                    const mergedBatches = blockchainBatches.map(blockchainBatch => {
                        const dbBatch = dbBatches.find((db: Batch) => db.batchId === blockchainBatch.id);
                        return {
                            ...blockchainBatch,
                            batchId: blockchainBatch.id,
                            transactions: dbBatch?.transactions || []
                        };
                    });

                    setBatches(mergedBatches);
                } catch (dbError) {
                    console.error('Error fetching batches from database:', dbError);
                    // If database fetch fails, just use blockchain data
                    const blockchainOnlyBatches = blockchainBatches.map(batch => ({
                        ...batch,
                        batchId: batch.id,
                        transactions: []
                    }));
                    setBatches(blockchainOnlyBatches);
                }
            } catch (err) {
                console.error('Error fetching batches:', err);
                setError('Failed to fetch batches');
                toast({
                    title: "Error",
                    description: "Failed to fetch batches",
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (!address) {
                setIsAdminUser(false);
                setIsCheckingAdmin(false);
                return;
            }

            try {
                const adminStatus = await isAdmin(address);
                setIsAdminUser(adminStatus);
            } catch (error) {
                console.error("Error checking admin status:", error);
                setIsAdminUser(false);
            } finally {
                setIsCheckingAdmin(false);
            }
        };

        checkAdminStatus();
    }, [address]);

    useEffect(() => {
        fetchBatches();
        const interval = setInterval(fetchBatches, 10000);
        return () => clearInterval(interval);
    }, [isConnected, isAdminUser, toast]);

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
        if (!address || !isAdminUser) return;

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
        if (!address || !isAdminUser) return;

        setIsLoading(true);
        try {
            // Verify batch on blockchain
            await verifyBatch(parseInt(batchId));

            try {
                // Use the correct API endpoint URL with port 5500
                const apiUrl = 'http://localhost:5500/api/batches';

                // Update batch status in database
                const response = await fetch(apiUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        batchId,
                        verified: true,
                        finalized: false
                    })
                });

                if (!response.ok) {
                    throw new Error(`Error updating batch: ${response.status} ${response.statusText}`);
                }
            } catch (dbError) {
                console.error('Error updating batch in database:', dbError);
                // Continue even if database update fails
            }

            await fetchBatches();
            toast({
                title: "Success",
                description: "Batch verified successfully"
            });
        } catch (err) {
            console.error('Error verifying batch:', err);
            setError('Failed to verify batch');
            toast({
                title: "Error",
                description: "Failed to verify batch",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinalizeBatch = async (batchId: string) => {
        if (!address || !isAdminUser) return;

        setIsLoading(true);
        try {
            // Convert batchId to number and verify it exists
            const numericBatchId = parseInt(batchId, 10);
            if (isNaN(numericBatchId)) {
                throw new Error('Invalid batch ID');
            }

            // Finalize batch on blockchain
            await finalizeBatch(numericBatchId);

            try {
                // Use the correct API endpoint URL with port 5500
                const apiUrl = 'http://localhost:5500/api/batches';

                // Update batch status in database
                const response = await fetch(apiUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        batchId,
                        verified: true,
                        finalized: true
                    })
                });

                if (!response.ok) {
                    throw new Error(`Error updating batch: ${response.status} ${response.statusText}`);
                }
            } catch (dbError) {
                console.error('Error updating batch in database:', dbError);
                // Continue even if database update fails
            }

            await fetchBatches();
            toast({
                title: "Success",
                description: "Batch finalized successfully"
            });
        } catch (err) {
            console.error('Error finalizing batch:', err);
            setError('Failed to finalize batch');
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : "Failed to finalize batch",
                variant: "destructive"
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

    if (isCheckingAdmin) {
        return (
            <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
                <CardContent className="py-8">
                    <div className="text-center text-white/70">
                        Checking admin access...
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!isAdminUser) {
        return (
            <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
                <CardContent className="py-8">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Access Denied</AlertTitle>
                        <AlertDescription>
                            Only admin users can manage batches.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
            <CardHeader>
                <CardTitle className="text-2xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                    Batch Manager
                </CardTitle>
                <CardDescription className="text-white/70">
                    Manage transaction batches and Merkle trees
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    <Button
                        onClick={handleSubmitBatch}
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all duration-200"
                    >
                        {isLoading ? "Submitting..." : "Submit New Batch"}
                    </Button>

                    {error && (
                        <div className="text-red-500">{error}</div>
                    )}

                    {isLoading && batches.length === 0 ? (
                        <div className="text-center py-4">Loading batches...</div>
                    ) : batches.length === 0 ? (
                        <div className="text-center py-4">No batches found</div>
                    ) : (
                        <div className="space-y-6">
                            {batches.map((batch) => (
                                <Card key={batch.id} className="p-4">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="text-lg font-medium">Batch #{batch.batchId}</h3>
                                                <p className="text-sm text-gray-500">
                                                    Merkle Root: {batch.transactionsRoot}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    Timestamp: {new Date(parseInt(batch.timestamp) * 1000).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusBadge(batch)}
                                                {!batch.verified && (
                                                    <Button
                                                        onClick={() => handleVerifyBatch(batch.batchId)}
                                                        disabled={isLoading}
                                                    >
                                                        Verify
                                                    </Button>
                                                )}
                                                {batch.verified && !batch.finalized && (
                                                    <Button
                                                        onClick={() => handleFinalizeBatch(batch.batchId)}
                                                        disabled={isLoading}
                                                    >
                                                        Finalize
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {batch.transactions && batch.transactions.length > 0 && (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>From</TableHead>
                                                        <TableHead>To</TableHead>
                                                        <TableHead>Amount (ETH)</TableHead>
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
                                                            <TableCell>{typeof tx.value === 'string' && tx.value.includes('.') ? tx.value : formatEther(tx.value)} ETH</TableCell>
                                                            <TableCell>
                                                                <Badge variant="default">{tx.status}</Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                {new Date(tx.timestamp * 1000).toLocaleString()}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default AdminBatchManager; 