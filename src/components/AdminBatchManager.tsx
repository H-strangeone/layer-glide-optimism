import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { getBatches, submitBatchWithMerkleRoot, verifyBatch, finalizeBatch, isAdmin } from "@/lib/ethers";
import { useWallet } from "@/hooks/useWallet";
import { createMerkleTreeFromTransactions, Transaction } from "@/lib/merkleTree";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { BatchDetails } from './BatchDetails';

interface Batch {
    id: string;
    transactionsRoot: string;
    timestamp: string;
    verified: boolean;
    finalized: boolean;
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
        const fetchBatches = async () => {
            if (isConnected && isAdminUser) {
                try {
                    const fetchedBatches = await getBatches();
                    setBatches(fetchedBatches);
                } catch (error) {
                    console.error("Error fetching batches:", error);
                    if (error instanceof Error && error.message.includes("Unauthorized")) {
                        toast({
                            title: "Access Denied",
                            description: "Only admin users can view batches",
                            variant: "destructive",
                        });
                    } else {
                        toast({
                            title: "Error",
                            description: "Failed to fetch batches",
                            variant: "destructive",
                        });
                    }
                }
            }
        };

        fetchBatches();
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
            const fetchedBatches = await getBatches();
            setBatches(fetchedBatches);
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

    const handleVerifyBatch = async () => {
        if (!selectedBatch || !isAdminUser) return;

        setIsLoading(true);
        try {
            await verifyBatch(parseInt(selectedBatch.id));

            toast({
                title: "Batch Verified",
                description: "Batch verified successfully",
            });

            // Refresh batches
            const fetchedBatches = await getBatches();
            setBatches(fetchedBatches);
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

    const handleFinalizeBatch = async () => {
        if (!selectedBatch || !isAdminUser) return;

        setIsLoading(true);
        try {
            await finalizeBatch(parseInt(selectedBatch.id));

            toast({
                title: "Batch Finalized",
                description: "Batch finalized successfully",
            });

            // Refresh batches
            const fetchedBatches = await getBatches();
            setBatches(fetchedBatches);
        } catch (error: any) {
            console.error("Error finalizing batch:", error);
            let errorMessage = "Failed to finalize batch";

            // Check for challenge period error
            if (error.message?.includes("Challenge period not over")) {
                const batchTimestamp = parseInt(selectedBatch.timestamp);
                const currentTime = Math.floor(Date.now() / 1000);
                const timeLeft = (batchTimestamp + 7 * 24 * 60 * 60) - currentTime;
                const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60));

                errorMessage = `Cannot finalize batch yet. Challenge period of 1 week must pass. ${daysLeft} days remaining.`;
            }

            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
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

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-white">Transaction Batches</h3>
                        {batches.length === 0 ? (
                            <div className="text-white/70">No batches found</div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {batches.map((batch) => (
                                    <Button
                                        key={batch.id}
                                        variant={selectedBatch?.id === batch.id ? "default" : "outline"}
                                        className="justify-start"
                                        onClick={() => handleBatchSelect(batch)}
                                    >
                                        <div className="flex flex-col items-start">
                                            <span>Batch #{batch.id}</span>
                                            <span className="text-xs text-white/70">
                                                Status: {batch.verified ? 'Verified' : batch.finalized ? 'Finalized' : 'Pending'} | {new Date(parseInt(batch.timestamp) * 1000).toLocaleString()}
                                            </span>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedBatch && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-white">Batch Actions</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Button
                                    onClick={handleVerifyBatch}
                                    disabled={isLoading || selectedBatch.verified}
                                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white transition-all duration-200"
                                >
                                    {isLoading ? "Verifying..." : "Verify Batch"}
                                </Button>
                                <Button
                                    onClick={handleFinalizeBatch}
                                    disabled={isLoading || selectedBatch.finalized}
                                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white transition-all duration-200"
                                >
                                    {isLoading ? "Finalizing..." : "Finalize Batch"}
                                </Button>
                            </div>
                        </div>
                    )}

                    {selectedBatch && (
                        <div className="mt-6">
                            <BatchDetails batch={selectedBatch} />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default AdminBatchManager; 