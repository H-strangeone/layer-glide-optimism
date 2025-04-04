import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { getBatches, getBatchTransactions } from "@/lib/ethers";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { createMerkleTreeFromTransactions } from "@/lib/merkle";

interface Batch {
    id: string;
    transactionsRoot: string;
    timestamp: string;
    verified: boolean;
    finalized: boolean;
}

interface BatchDetails {
    batch: Batch;
    transactions: any[];
    merkleRoot: string;
    merkleProof?: string[];
}

export function BatchHistory() {
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBatch, setSelectedBatch] = useState<BatchDetails | null>(null);
    const [showBatchDetails, setShowBatchDetails] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchBatches();
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
            const merkleTree = createMerkleTreeFromTransactions(batchTransactions);
            const merkleRoot = merkleTree.getRoot();

            setSelectedBatch({
                batch,
                transactions: batchTransactions,
                merkleRoot: merkleRoot,
                merkleProof: merkleTree.getProof(batchTransactions[0]) // Example proof for first transaction
            });
            setShowBatchDetails(true);
        } catch (error) {
            console.error("Error fetching batch details:", error);
            toast({
                title: "Error",
                description: "Failed to fetch batch details",
                variant: "destructive",
            });
        }
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(parseInt(timestamp) * 1000).toLocaleString();
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Batch History</CardTitle>
                <CardDescription>
                    View all submitted batches and their details
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
                                <TableHead>Merkle Root</TableHead>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {batches.map((batch) => (
                                <TableRow key={batch.id}>
                                    <TableCell className="font-mono">{batch.id}</TableCell>
                                    <TableCell className="font-mono">{batch.transactionsRoot.slice(0, 8)}...</TableCell>
                                    <TableCell>{formatTimestamp(batch.timestamp)}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Badge variant={batch.verified ? "success" : "warning"}>
                                                {batch.verified ? "Verified" : "Pending"}
                                            </Badge>
                                            <Badge variant={batch.finalized ? "success" : "warning"}>
                                                {batch.finalized ? "Finalized" : "Pending"}
                                            </Badge>
                                        </div>
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
                                        <Badge variant={selectedBatch.batch.finalized ? "success" : "warning"}>
                                            {selectedBatch.batch.finalized ? "Finalized" : "Pending"}
                                        </Badge>
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
                                                <TableCell className="font-mono">{tx.from.slice(0, 6)}...{tx.from.slice(-4)}</TableCell>
                                                <TableCell className="font-mono">{tx.to.slice(0, 6)}...{tx.to.slice(-4)}</TableCell>
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
        </Card>
    );
} 