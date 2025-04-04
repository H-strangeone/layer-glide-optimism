import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getBatches, getBatchTransactions } from "@/lib/ethers";
import { createMerkleTreeFromTransactions } from "@/lib/merkle";
import { Progress } from "@/components/ui/progress";

interface Batch {
    id: string;
    transactionsRoot: string;
    timestamp: number;
    verified: boolean;
    finalized: boolean;
    challengePeriodEnd: number;
}

interface BatchDetails {
    batch: Batch;
    transactions: any[];
    merkleRoot: string;
    merkleProof?: string[];
}

export function BatchManager() {
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBatch, setSelectedBatch] = useState<BatchDetails | null>(null);
    const [showBatchDetails, setShowBatchDetails] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchBatches();
        // Refresh every 30 seconds
        const interval = setInterval(fetchBatches, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchBatches = async () => {
        try {
            setLoading(true);
            const batchList = await getBatches();
            setBatches(batchList);
        } catch (error) {
            console.error("Error fetching batches:", error);
            toast({
                title: "Error",
                description: "Failed to fetch batches",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleViewBatchDetails = async (batch: Batch) => {
        try {
            const batchTransactions = await getBatchTransactions(batch.id);

            // If there are no transactions, just show the batch details without Merkle info
            if (batchTransactions.length === 0) {
                setSelectedBatch({
                    batch,
                    transactions: [],
                    merkleRoot: batch.transactionsRoot,
                    merkleProof: []
                });
                setShowBatchDetails(true);
                return;
            }

            // Format transactions for Merkle tree
            const formattedTransactions = batchTransactions.map(tx => ({
                from: tx.from,
                to: tx.to,
                value: tx.value
            }));

            const merkleTree = createMerkleTreeFromTransactions(formattedTransactions);

            setSelectedBatch({
                batch,
                transactions: batchTransactions,
                merkleRoot: merkleTree.getHexRoot(),
                merkleProof: merkleTree.getHexProof(merkleTree.getLeaves()[0]) // Get proof for first transaction
            });
            setShowBatchDetails(true);
        } catch (error) {
            console.error("Error fetching batch details:", error);
            // Show batch details without Merkle info if there's an error
            setSelectedBatch({
                batch,
                transactions: [],
                merkleRoot: batch.transactionsRoot,
                merkleProof: []
            });
            setShowBatchDetails(true);
            toast({
                title: "Warning",
                description: "Could not load complete batch details. Some information may be missing.",
                variant: "warning",
            });
        }
    };

    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleString();
    };

    const calculateChallengeProgress = (batch: Batch) => {
        if (!batch.verified || batch.finalized) return 100;
        const now = Math.floor(Date.now() / 1000);
        const progress = ((now - batch.timestamp) / (batch.challengePeriodEnd - batch.timestamp)) * 100;
        return Math.min(Math.max(progress, 0), 100);
    };

    const getRemainingTime = (batch: Batch) => {
        if (!batch.verified || batch.finalized) return null;
        const now = Math.floor(Date.now() / 1000);
        const remaining = batch.challengePeriodEnd - now;
        if (remaining <= 0) return "Challenge period complete";

        const days = Math.floor(remaining / 86400);
        const hours = Math.floor((remaining % 86400) / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);

        return `${days}d ${hours}h ${minutes}m remaining in challenge period`;
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Transaction Batches</CardTitle>
                    <CardDescription>
                        View transaction batches and their current status on the Layer 2 network
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-4">Loading batches...</div>
                    ) : batches.length === 0 ? (
                        <div className="text-center py-4">No batches found</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Batch ID</TableHead>
                                    <TableHead>Transactions Root</TableHead>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Challenge Period</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {batches.map((batch) => (
                                    <TableRow key={batch.id}>
                                        <TableCell className="font-mono">{batch.id}</TableCell>
                                        <TableCell className="font-mono">{batch.transactionsRoot.slice(0, 10)}...</TableCell>
                                        <TableCell>{formatTimestamp(batch.timestamp)}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Badge variant={batch.verified ? "success" : "warning"}>
                                                    {batch.verified ? "Verified" : "Pending"}
                                                </Badge>
                                                {batch.verified && (
                                                    <Badge variant={batch.finalized ? "success" : "warning"}>
                                                        {batch.finalized ? "Finalized" : "In Challenge Period"}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {batch.verified && !batch.finalized && (
                                                <div className="space-y-2">
                                                    <Progress value={calculateChallengeProgress(batch)} />
                                                    <p className="text-sm text-muted-foreground">
                                                        {getRemainingTime(batch)}
                                                    </p>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleViewBatchDetails(batch)}
                                            >
                                                View Details
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Understanding Batch Processing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2">Batch States</h3>
                        <ul className="space-y-2">
                            <li className="flex items-center gap-2">
                                <Badge variant="warning">Pending</Badge>
                                <span>The batch has been submitted and is awaiting verification</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Badge variant="warning">In Challenge Period</Badge>
                                <span>The batch is verified and in the 7-day fraud proof window</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Badge variant="success">Finalized</Badge>
                                <span>The batch has completed the challenge period and state updates are final</span>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">Fraud Proof Window</h3>
                        <Alert>
                            <AlertDescription>
                                After a batch is verified, it enters a 7-day challenge period. During this time,
                                the network monitors for any potential fraud proofs. Once the period ends without
                                any valid fraud proofs, the batch is automatically finalized.
                            </AlertDescription>
                        </Alert>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={showBatchDetails} onOpenChange={setShowBatchDetails}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Batch Details</DialogTitle>
                        <DialogDescription>
                            View batch transactions and Merkle tree information
                        </DialogDescription>
                    </DialogHeader>
                    {selectedBatch && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-semibold">Batch ID</h3>
                                    <p className="font-mono">{selectedBatch.batch.id}</p>
                                </div>
                                <div>
                                    <h3 className="font-semibold">Merkle Root</h3>
                                    <p className="font-mono">{selectedBatch.merkleRoot}</p>
                                </div>
                                <div>
                                    <h3 className="font-semibold">Status</h3>
                                    <div className="flex gap-2">
                                        <Badge variant={selectedBatch.batch.verified ? "success" : "warning"}>
                                            {selectedBatch.batch.verified ? "Verified" : "Pending"}
                                        </Badge>
                                        {selectedBatch.batch.verified && (
                                            <Badge variant={selectedBatch.batch.finalized ? "success" : "warning"}>
                                                {selectedBatch.batch.finalized ? "Finalized" : "In Challenge Period"}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold">Timestamp</h3>
                                    <p>{formatTimestamp(selectedBatch.batch.timestamp)}</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">Merkle Proof (Example)</h3>
                                <div className="bg-muted p-2 rounded-md">
                                    <pre className="text-sm overflow-x-auto">
                                        {JSON.stringify(selectedBatch.merkleProof, null, 2)}
                                    </pre>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-2">Transactions</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>From</TableHead>
                                            <TableHead>To</TableHead>
                                            <TableHead>Value</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedBatch.transactions.map((tx, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-mono">
                                                    {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                                                </TableCell>
                                                <TableCell className="font-mono">
                                                    {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                                                </TableCell>
                                                <TableCell>{tx.value} ETH</TableCell>
                                                <TableCell>
                                                    <Badge variant={tx.status === "confirmed" ? "success" : "destructive"}>
                                                        {tx.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
} 