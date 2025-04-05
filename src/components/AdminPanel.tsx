import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { getContract, verifyBatch, finalizeBatch } from "@/lib/ethers";
import { toast } from "@/components/ui/use-toast";
import { formatEther } from "ethers";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Transaction {
    id: string;
    from: string;
    to: string;
    value: string;
    status: string;
    timestamp: number;
}

interface Batch {
    batchId: string;
    transactionsRoot: string;
    timestamp: string;
    verified: boolean;
    finalized: boolean;
    rejected: boolean;
    rejectionReason?: string;
    transactions: Transaction[];
}

export default function AdminPanel() {
    const { address, isConnected } = useWallet();
    const [isAdmin, setIsAdmin] = useState(false);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [batchToReject, setBatchToReject] = useState<string | null>(null);

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
                const response = await fetch('http://localhost:5500/api/batches');
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

    const handleVerifyBatch = async (batchId: string) => {
        setIsLoading(true);
        setSelectedBatch(batchId);
        try {
            const response = await fetch(`http://localhost:5500/api/batches/verify/${batchId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to verify batch');
            }

            toast({
                title: "Batch Verified",
                description: `Successfully verified batch #${batchId}`,
            });

            // Refresh batches
            const batchesResponse = await fetch('http://localhost:5500/api/batches');
            if (batchesResponse.ok) {
                const data = await batchesResponse.json();
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

    const handleFinalizeBatch = async (batchId: string) => {
        setIsLoading(true);
        setSelectedBatch(batchId);
        try {
            const response = await fetch(`http://localhost:5500/api/batches/finalize/${batchId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to finalize batch');
            }

            toast({
                title: "Batch Finalized",
                description: `Successfully finalized batch #${batchId}`,
            });

            // Refresh batches
            const batchesResponse = await fetch('http://localhost:5500/api/batches');
            if (batchesResponse.ok) {
                const data = await batchesResponse.json();
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

    const handleRejectBatch = async () => {
        if (!batchToReject) return;

        setIsLoading(true);
        try {
            const response = await fetch(`http://localhost:5500/api/batches/reject/${batchToReject}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: rejectionReason })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to reject batch');
            }

            toast({
                title: "Batch Rejected",
                description: `Successfully rejected batch #${batchToReject}`,
            });

            // Refresh batches
            const batchesResponse = await fetch('http://localhost:5500/api/batches');
            if (batchesResponse.ok) {
                const data = await batchesResponse.json();
                setBatches(data);
            }

            // Reset state
            setShowRejectDialog(false);
            setBatchToReject(null);
            setRejectionReason("");
        } catch (error) {
            console.error('Error rejecting batch:', error);
            toast({
                title: "Rejection Failed",
                description: error instanceof Error ? error.message : "Failed to reject batch",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const openRejectDialog = (batchId: string) => {
        setBatchToReject(batchId);
        setShowRejectDialog(true);
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
                                        key={batch.batchId}
                                        className="p-4 bg-gray-800 rounded-lg space-y-2"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h4 className="font-medium">Batch #{batch.batchId}</h4>
                                                <p className="text-sm text-gray-400">
                                                    {batch.transactions?.length || 0} transactions
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {!batch.verified && !batch.finalized && !batch.rejected && (
                                                    <>
                                                        <Button
                                                            onClick={() => handleVerifyBatch(batch.batchId)}
                                                            disabled={isLoading && selectedBatch === batch.batchId}
                                                            className="bg-purple-500 hover:bg-purple-600"
                                                        >
                                                            {isLoading && selectedBatch === batch.batchId
                                                                ? "Verifying..."
                                                                : "Verify"}
                                                        </Button>
                                                        <Button
                                                            onClick={() => openRejectDialog(batch.batchId)}
                                                            disabled={isLoading}
                                                            className="bg-red-500 hover:bg-red-600"
                                                        >
                                                            Reject
                                                        </Button>
                                                    </>
                                                )}
                                                {batch.verified && !batch.finalized && !batch.rejected && (
                                                    <Button
                                                        onClick={() => handleFinalizeBatch(batch.batchId)}
                                                        disabled={isLoading && selectedBatch === batch.batchId}
                                                        className="bg-green-500 hover:bg-green-600"
                                                    >
                                                        {isLoading && selectedBatch === batch.batchId
                                                            ? "Finalizing..."
                                                            : "Finalize"}
                                                    </Button>
                                                )}
                                                {batch.finalized && (
                                                    <span className="text-green-400">✓ Finalized</span>
                                                )}
                                                {batch.rejected && (
                                                    <span className="text-red-400">✗ Rejected</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Root: {batch.transactionsRoot.slice(0, 10)}...
                                            {batch.transactionsRoot.slice(-8)}
                                        </div>
                                        {batch.rejectionReason && (
                                            <div className="text-xs text-red-400">
                                                Reason: {batch.rejectionReason}
                                            </div>
                                        )}

                                        {/* Transaction details */}
                                        {batch.transactions && batch.transactions.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-gray-700">
                                                <h5 className="text-sm font-medium mb-2">Transactions</h5>
                                                <div className="space-y-1">
                                                    {batch.transactions.map((tx) => (
                                                        <div key={tx.id} className="text-xs grid grid-cols-4 gap-2">
                                                            <div className="truncate">
                                                                From: {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                                                            </div>
                                                            <div className="truncate">
                                                                To: {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                                                            </div>
                                                            <div>
                                                                {formatEther(tx.value)} ETH
                                                            </div>
                                                            <div>
                                                                {formatDistanceToNow(new Date(tx.timestamp * 1000), { addSuffix: true })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>

            {/* Reject Batch Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Batch</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to reject this batch? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="reason">Rejection Reason</Label>
                        <Input
                            id="reason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Enter reason for rejection"
                            className="mt-1"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleRejectBatch}
                            disabled={isLoading}
                        >
                            {isLoading ? "Rejecting..." : "Reject Batch"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
} 