import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "@/components/ui/use-toast";

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

interface Transaction {
    hash: string;
    from: string;
    to: string;
    value: string;
    status: string;
    timestamp: number;
    batchId?: string;
}

export default function AdminPage() {
    const { address, isConnected } = useWallet();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminAddress, setAdminAddress] = useState("");

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (!isConnected || !address) return;

            try {
                // Check if the current user is the admin
                const response = await fetch(`http://localhost:5500/api/admin/check?address=${address}`);
                const data = await response.json();

                setIsAdmin(data.isAdmin);
                setAdminAddress(data.adminAddress || "");
            } catch (err) {
                console.error("Error checking admin status:", err);
            }
        };

        checkAdminStatus();
    }, [isConnected, address]);

    useEffect(() => {
        const fetchBatches = async () => {
            setLoading(true);
            try {
                const response = await fetch("http://localhost:5500/api/batches");
                if (!response.ok) {
                    throw new Error("Failed to fetch batches");
                }

                const data = await response.json();
                setBatches(data);
                setError(null);
            } catch (err) {
                console.error("Error fetching batches:", err);
                setError("Failed to load batches");
            } finally {
                setLoading(false);
            }
        };

        fetchBatches();

        // Refresh batches every 30 seconds
        const interval = setInterval(fetchBatches, 30000);

        return () => clearInterval(interval);
    }, []);

    const handleVerifyBatch = async (batchId: string) => {
        if (!isConnected || !address) {
            toast({
                title: "Error",
                description: "Please connect your wallet first",
                variant: "destructive",
            });
            return;
        }

        try {
            const response = await fetch("http://localhost:5500/api/batches/verify", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-admin-address": address,
                },
                body: JSON.stringify({ batchId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to verify batch");
            }

            toast({
                title: "Success",
                description: `Batch ${batchId} verified successfully`,
            });

            // Refresh batches
            const batchesResponse = await fetch("http://localhost:5500/api/batches");
            const batchesData = await batchesResponse.json();
            setBatches(batchesData);
        } catch (err: any) {
            console.error("Error verifying batch:", err);
            toast({
                title: "Error",
                description: err.message || "Failed to verify batch",
                variant: "destructive",
            });
        }
    };

    const handleRejectBatch = async (batchId: string) => {
        if (!isConnected || !address) {
            toast({
                title: "Error",
                description: "Please connect your wallet first",
                variant: "destructive",
            });
            return;
        }

        try {
            const response = await fetch("http://localhost:5500/api/batches/reject", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-admin-address": address,
                },
                body: JSON.stringify({
                    batchId,
                    reason: rejectionReason || "Rejected by admin"
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to reject batch");
            }

            toast({
                title: "Success",
                description: `Batch ${batchId} rejected successfully`,
            });

            // Reset rejection reason and selected batch
            setRejectionReason("");
            setSelectedBatch(null);

            // Refresh batches
            const batchesResponse = await fetch("http://localhost:5500/api/batches");
            const batchesData = await batchesResponse.json();
            setBatches(batchesData);
        } catch (err: any) {
            console.error("Error rejecting batch:", err);
            toast({
                title: "Error",
                description: err.message || "Failed to reject batch",
                variant: "destructive",
            });
        }
    };

    if (!isConnected) {
        return (
            <div className="container mx-auto py-8">
                <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
                    <CardContent className="py-8">
                        <div className="text-center text-white/70">
                            Please connect your wallet to access the admin panel
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="container mx-auto py-8">
                <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
                    <CardContent className="py-8">
                        <div className="text-center text-white/70">
                            You do not have admin privileges. Only the admin address ({adminAddress}) can access this page.
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 space-y-8">
            <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                Admin Panel
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
                        <CardHeader>
                            <CardTitle className="text-xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                                Batches
                            </CardTitle>
                            <CardDescription className="text-white/70">
                                Manage transaction batches
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                                    <p className="mt-2 text-white/70">Loading batches...</p>
                                </div>
                            ) : error ? (
                                <div className="text-center py-8 text-red-400">
                                    {error}
                                </div>
                            ) : batches.length === 0 ? (
                                <div className="text-center py-8 text-white/70">
                                    No batches found
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                                    {batches.map((batch) => (
                                        <div
                                            key={batch.batchId}
                                            className={`p-4 rounded-lg border ${batch.verified
                                                ? "bg-green-500/10 border-green-500/20"
                                                : batch.rejected
                                                    ? "bg-red-500/10 border-red-500/20"
                                                    : "bg-white/5 border-white/10"
                                                }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-white">Batch #{batch.batchId}</span>
                                                        <span className={`px-2 py-1 rounded text-xs ${batch.verified ? "bg-green-500/20 text-green-400" :
                                                            batch.rejected ? "bg-red-500/20 text-red-400" :
                                                                "bg-yellow-500/20 text-yellow-400"
                                                            }`}>
                                                            {batch.verified ? "Verified" : batch.rejected ? "Rejected" : "Pending"}
                                                        </span>
                                                    </div>
                                                    <div className="text-white/70 text-sm mt-1">
                                                        {new Date(batch.timestamp).toLocaleString()}
                                                    </div>
                                                    <div className="text-white/70 text-sm mt-1">
                                                        {batch.transactions.length} transactions
                                                    </div>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setSelectedBatch(batch)}
                                                        className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                                                    >
                                                        View Details
                                                    </Button>
                                                    {!batch.verified && !batch.rejected && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleVerifyBatch(batch.batchId)}
                                                                className="bg-green-500 hover:bg-green-600"
                                                            >
                                                                Verify
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedBatch(batch);
                                                                    setRejectionReason("");
                                                                }}
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
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div>
                    {selectedBatch ? (
                        <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
                            <CardHeader>
                                <CardTitle className="text-xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                                    Batch Details
                                </CardTitle>
                                <CardDescription className="text-white/70">
                                    {selectedBatch.rejected && selectedBatch.rejectionReason && (
                                        <div className="text-red-400 mt-2">
                                            Rejection reason: {selectedBatch.rejectionReason}
                                        </div>
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <div className="text-white/70">Batch ID</div>
                                        <div className="font-mono text-white break-all text-sm">{selectedBatch.batchId}</div>
                                    </div>

                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <div className="text-white/70">Transactions Root</div>
                                        <div className="font-mono text-white break-all text-sm">{selectedBatch.transactionsRoot}</div>
                                    </div>

                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <div className="text-white/70">Status</div>
                                        <div className={`${selectedBatch.verified ? "text-green-400" :
                                            selectedBatch.rejected ? "text-red-400" :
                                                "text-yellow-400"
                                            }`}>
                                            {selectedBatch.verified ? "Verified" : selectedBatch.rejected ? "Rejected" : "Pending"}
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <div className="text-white/70 mb-2">Transactions</div>
                                        {selectedBatch.transactions.length === 0 ? (
                                            <div className="text-white/70 text-sm">No transactions in this batch</div>
                                        ) : (
                                            <div className="space-y-2">
                                                {selectedBatch.transactions.map((tx, index) => (
                                                    <div key={index} className="text-sm p-2 rounded bg-white/5">
                                                        <div className="flex justify-between">
                                                            <span className="text-white/70">From:</span>
                                                            <span className="text-white">{tx.from}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-white/70">To:</span>
                                                            <span className="text-white">{tx.to}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-white/70">Amount:</span>
                                                            <span className="text-white">{tx.value} ETH</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-white/70">Status:</span>
                                                            <span className={`${tx.status === 'confirmed' ? 'text-green-400' :
                                                                tx.status === 'pending' ? 'text-yellow-400' :
                                                                    'text-red-400'
                                                                }`}>
                                                                {tx.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {selectedBatch.rejected && (
                                        <div className="space-y-2">
                                            <Textarea
                                                placeholder="Rejection reason"
                                                value={rejectionReason}
                                                onChange={(e) => setRejectionReason(e.target.value)}
                                                className="bg-white/5 border-white/10 text-white"
                                            />
                                            <div className="flex space-x-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setSelectedBatch(null)}
                                                    className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    onClick={() => handleRejectBatch(selectedBatch.batchId)}
                                                >
                                                    Confirm Rejection
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {!selectedBatch.rejected && (
                                        <Button
                                            variant="outline"
                                            onClick={() => setSelectedBatch(null)}
                                            className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
                                        >
                                            Close
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
                            <CardHeader>
                                <CardTitle className="text-xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                                    Batch Details
                                </CardTitle>
                                <CardDescription className="text-white/70">
                                    Select a batch to view details
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-8 text-white/70">
                                    Select a batch from the list to view its details
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
} 