import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { createMerkleTreeFromTransactions, Transaction, verifyMerkleProof } from "@/lib/merkleTree";
import { getBatches, reportFraudWithMerkleProof, isAdmin } from "@/lib/ethers";
import { useWallet } from "@/hooks/useWallet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface Batch {
    id: string;
    transactionsRoot: string;
    timestamp: string;
    verified: boolean;
    finalized: boolean;
}

const MerkleTreeInfo = () => {
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
        setMerkleRoot(batch.transactionsRoot);
    };

    const handleReportFraud = async () => {
        if (!selectedBatch || !address || !isAdminUser) return;

        setIsLoading(true);
        try {
            // In a real implementation, we would:
            // 1. Fetch the actual transactions for this batch
            // 2. Find the fraudulent transaction
            // 3. Generate a Merkle proof for it
            // 4. Submit the fraud report with the proof

            // For demonstration purposes, we'll create a dummy transaction and proof
            const dummyTransaction: Transaction = {
                sender: address,
                recipient: "0x0000000000000000000000000000000000000000",
                amount: "0.1"
            };

            const dummyProof = ["0x0000000000000000000000000000000000000000000000000000000000000000"];

            await reportFraudWithMerkleProof(
                selectedBatch.id,
                "0x0000000000000000000000000000000000000000000000000000000000000000",
                dummyTransaction,
                dummyProof
            );

            toast({
                title: "Fraud Reported",
                description: "Fraud report submitted successfully",
            });
        } catch (error) {
            console.error("Error reporting fraud:", error);
            toast({
                title: "Error",
                description: "Failed to report fraud",
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
                        Please connect your wallet to view Merkle tree information
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
                            Only admin users can view and manage Merkle trees.
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
                    Merkle Tree Information
                </CardTitle>
                <CardDescription className="text-white/70">
                    View and verify Merkle trees for transaction batches
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
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
                            <h3 className="text-lg font-medium text-white">Batch Details</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-white/70">Batch ID:</span>
                                    <span className="text-white">{selectedBatch.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/70">Status:</span>
                                    <span className="text-white">{selectedBatch.verified ? 'Verified' : selectedBatch.finalized ? 'Finalized' : 'Pending'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/70">Timestamp:</span>
                                    <span className="text-white">{new Date(parseInt(selectedBatch.timestamp) * 1000).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/70">Merkle Root:</span>
                                    <span className="text-white font-mono text-xs break-all">{selectedBatch.transactionsRoot}</span>
                                </div>
                            </div>

                            <Button
                                onClick={handleReportFraud}
                                disabled={isLoading || selectedBatch.finalized}
                                className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white transition-all duration-200"
                            >
                                {isLoading ? "Reporting Fraud..." : "Report Fraud"}
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default MerkleTreeInfo; 