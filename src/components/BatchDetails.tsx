import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { getBatchTransactions } from "@/lib/ethers";

interface BatchDetailsProps {
    batch: {
        id: string;
        transactionsRoot: string;
        timestamp: string;
        verified: boolean;
        finalized: boolean;
    };
}

export const BatchDetails = ({ batch }: BatchDetailsProps) => {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchTransactions = async () => {
            setLoading(true);
            try {
                const txs = await getBatchTransactions(batch.id);
                setTransactions(txs);
            } catch (error) {
                console.error('Error fetching batch transactions:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();
    }, [batch.id]);

    const getStatusBadge = () => {
        if (batch.finalized) {
            return <Badge variant="success">Finalized</Badge>;
        } else if (batch.verified) {
            return <Badge variant="warning">Verified</Badge>;
        } else {
            return <Badge variant="secondary">Pending</Badge>;
        }
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(parseInt(timestamp) * 1000);
        return formatDistanceToNow(date, { addSuffix: true });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Batch Details</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold">Batch ID</h3>
                        <p className="text-sm text-gray-500">{batch.id}</p>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Status</h3>
                        <div className="flex gap-2">
                            <Badge variant={batch.verified ? "success" : "secondary"}>
                                {batch.verified ? "Verified" : "Unverified"}
                            </Badge>
                            <Badge variant={batch.finalized ? "success" : "secondary"}>
                                {batch.finalized ? "Finalized" : "Not Finalized"}
                            </Badge>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Timestamp</h3>
                        <p className="text-sm text-gray-500">
                            {new Date(parseInt(batch.timestamp) * 1000).toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Merkle Root</h3>
                        <p className="text-sm text-gray-500 font-mono">{batch.transactionsRoot}</p>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Transactions</h3>
                        {loading ? (
                            <p>Loading transactions...</p>
                        ) : transactions.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>From</TableHead>
                                        <TableHead>To</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Timestamp</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((tx, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{tx.from}</TableCell>
                                            <TableCell>{tx.to}</TableCell>
                                            <TableCell>{tx.value} ETH</TableCell>
                                            <TableCell>
                                                <Badge variant="success">{tx.status}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(tx.createdAt * 1000).toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p>No transactions found in this batch.</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}; 