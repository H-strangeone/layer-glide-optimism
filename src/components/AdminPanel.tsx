import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { getContract, verifyBatch, finalizeBatch } from "@/lib/ethers";
import { toast } from "@/components/ui/use-toast";

interface Batch {
    id: number;
    status: 'pending' | 'verified' | 'finalized';
    transactionsRoot: string;
    timestamp: number;
    transactionCount: number;
}

export default function AdminPanel() {
    const { address, isConnected } = useWallet();
    const [isAdmin, setIsAdmin] = useState(false);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<number | null>(null);

    useEffect(() => {
        const checkAdmin = async () => {
            if (address) {
                try {
                    const contract = await getContract();
                    const adminAddress = await contract.admin();
                    setIsAdmin(adminAddress.toLowerCase() === address.toLowerCase());
                } catch (error) {
                    console.error('Error checking admin:', error);
                }
            }
        };

        checkAdmin();
    }, [address]);

    useEffect(() => {
        const fetchBatches = async () => {
            if (!isAdmin) return;

            try {
                const response = await fetch('/api/batches');
                if (response.ok) {
                    const data = await response.json();
                    setBatches(data);
                }
            } catch (error) {
                console.error('Error fetching batches:', error);
            }
        };

        fetchBatches();
        const interval = setInterval(fetchBatches, 10000);
        return () => clearInterval(interval);
    }, [isAdmin]);

    const handleVerifyBatch = async (batchId: number) => {
        setIsLoading(true);
        setSelectedBatch(batchId);
        try {
            await verifyBatch(batchId);
            toast({
                title: "Batch Verified",
                description: `Successfully verified batch #${batchId}`,
            });
            // Refresh batches
            const response = await fetch('/api/batches');
            if (response.ok) {
                const data = await response.json();
                setBatches(data);
            }
        } catch (error) {
            console.error('Error verifying batch:', error);
            toast({
                title: "Verification Failed",
                description: error instanceof Error ? error.message : "Failed to verify batch",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
            setSelectedBatch(null);
        }
    };

    const handleFinalizeBatch = async (batchId: number) => {
        setIsLoading(true);
        setSelectedBatch(batchId);
        try {
            await finalizeBatch(batchId);
            toast({
                title: "Batch Finalized",
                description: `Successfully finalized batch #${batchId}`,
            });
            // Refresh batches
            const response = await fetch('/api/batches');
            if (response.ok) {
                const data = await response.json();
                setBatches(data);
            }
        } catch (error) {
            console.error('Error finalizing batch:', error);
            toast({
                title: "Finalization Failed",
                description: error instanceof Error ? error.message : "Failed to finalize batch",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
            setSelectedBatch(null);
        }
    };

    if (!isConnected || !isAdmin) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Admin Dashboard</CardTitle>
                <CardDescription>Manage Layer 2 batches and transactions</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium mb-4">Batch Management</h3>
                        {batches.length === 0 ? (
                            <p className="text-sm text-gray-500">No batches available</p>
                        ) : (
                            <div className="space-y-4">
                                {batches.map((batch) => (
                                    <div
                                        key={batch.id}
                                        className="p-4 bg-gray-800 rounded-lg space-y-2"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h4 className="font-medium">Batch #{batch.id}</h4>
                                                <p className="text-sm text-gray-400">
                                                    {batch.transactionCount} transactions
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {batch.status === 'pending' && (
                                                    <Button
                                                        onClick={() => handleVerifyBatch(batch.id)}
                                                        disabled={isLoading && selectedBatch === batch.id}
                                                        className="bg-purple-500 hover:bg-purple-600"
                                                    >
                                                        {isLoading && selectedBatch === batch.id
                                                            ? "Verifying..."
                                                            : "Verify"}
                                                    </Button>
                                                )}
                                                {batch.status === 'verified' && (
                                                    <Button
                                                        onClick={() => handleFinalizeBatch(batch.id)}
                                                        disabled={isLoading && selectedBatch === batch.id}
                                                        className="bg-green-500 hover:bg-green-600"
                                                    >
                                                        {isLoading && selectedBatch === batch.id
                                                            ? "Finalizing..."
                                                            : "Finalize"}
                                                    </Button>
                                                )}
                                                {batch.status === 'finalized' && (
                                                    <span className="text-green-400">✓ Finalized</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Root: {batch.transactionsRoot.slice(0, 10)}...
                                            {batch.transactionsRoot.slice(-8)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
} 