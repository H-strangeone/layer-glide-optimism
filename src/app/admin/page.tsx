"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { formatEther } from "ethers";

interface Batch {
    id: string;
    status: string;
    transactions: Transaction[];
    timestamp: number;
    size: number;
}

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

export default function AdminPage() {
    const { address, isConnected } = useWallet();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
    const { toast } = useToast();

    // Check if the connected wallet is the admin
    useEffect(() => {
        const checkAdminStatus = async () => {
            if (!isConnected || !address) {
                setIsAdmin(false);
                return;
            }

            try {
                const response = await fetch(`http://localhost:5500/api/admin/check?address=${address}`);
                const data = await response.json();

                if (data.success && data.isAdmin) {
                    setIsAdmin(true);
                    fetchBatches();
                } else {
                    setIsAdmin(false);
                }
            } catch (error) {
                console.error("Error checking admin status:", error);
                setIsAdmin(false);
            }
        };

        checkAdminStatus();
    }, [isConnected, address]);

    const fetchBatches = async () => {
        try {
            setLoading(true);
            const response = await fetch("http://localhost:5500/api/batches", {
                headers: {
                    "x-admin-address": address || "",
                }
            });

            if (!response.ok) {
                throw new Error("Failed to fetch batches");
            }

            const data = await response.json();
            setBatches(data);
        } catch (error) {
            console.error("Error fetching batches:", error);
            setError("Failed to fetch batches");
        } finally {
            setLoading(false);
        }
    };

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
            setLoading(true);
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
                throw new Error(errorData.message || "Failed to verify batch");
            }

            toast({
                title: "Success",
                description: "Batch verified successfully",
            });

            // Refresh batches
            fetchBatches();
        } catch (error) {
            console.error("Error verifying batch:", error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to verify batch",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
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

        if (!rejectionReason) {
            toast({
                title: "Error",
                description: "Please provide a reason for rejection",
                variant: "destructive",
            });
            return;
        }

        try {
            setLoading(true);
            const response = await fetch("http://localhost:5500/api/batches/reject", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-admin-address": address,
                },
                body: JSON.stringify({ batchId, reason: rejectionReason }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to reject batch");
            }

            toast({
                title: "Success",
                description: "Batch rejected successfully",
            });

            // Reset rejection reason and selected batch
            setRejectionReason("");
            setSelectedBatch(null);

            // Refresh batches
            fetchBatches();
        } catch (error) {
            console.error("Error rejecting batch:", error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to reject batch",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case "pending":
                return <Badge variant="secondary">Pending</Badge>;
            case "verified":
            case "confirmed":
                return <Badge variant="default">Verified</Badge>;
            case "rejected":
                return <Badge variant="destructive">Rejected</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const formatTimestamp = (timestamp: number) => {
        return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
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
                            You do not have admin privileges. Only the admin address can access this panel.
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

            <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
                <CardHeader>
                    <CardTitle className="text-xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                        Batch Management
                    </CardTitle>
                    <CardDescription className="text-white/70">
                        Verify or reject transaction batches
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
                        <div className="space-y-6">
                            {batches.map((batch) => (
                                <div key={batch.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="text-lg font-medium text-white">Batch {batch.id}</h3>
                                            <p className="text-sm text-white/70">
                                                {batch.size} transactions • {formatTimestamp(batch.timestamp)}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {getStatusBadge(batch.status)}
                                            {batch.status === "pending" && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleVerifyBatch(batch.id)}
                                                    disabled={loading}
                                                >
                                                    Verify
                                                </Button>
                                            )}
                                            {batch.status === "pending" && (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => setSelectedBatch(batch.id)}
                                                    disabled={loading}
                                                >
                                                    Reject
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {selectedBatch === batch.id && (
                                        <div className="mt-4 space-y-4">
                                            <Textarea
                                                placeholder="Enter reason for rejection"
                                                value={rejectionReason}
                                                onChange={(e) => setRejectionReason(e.target.value)}
                                                className="bg-white/5 border-white/10 text-white"
                                            />
                                            <div className="flex justify-end space-x-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedBatch(null);
                                                        setRejectionReason("");
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    onClick={() => handleRejectBatch(batch.id)}
                                                    disabled={!rejectionReason || loading}
                                                >
                                                    Confirm Rejection
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 