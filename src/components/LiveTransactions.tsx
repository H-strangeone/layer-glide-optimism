import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatEther } from 'ethers';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink } from 'lucide-react';

interface Transaction {
    hash: string;
    from: string;
    to: string;
    value: string;
    status: string;
    createdAt: number;
    batchId?: string;
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

export default function LiveTransactions() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTransactions = async () => {
            setLoading(true);
            try {
                const response = await fetch('http://localhost:5500/api/transactions/live');

                if (!response.ok) {
                    throw new Error(`Failed to fetch live transactions: ${response.status}`);
                }

                const data = await response.json();
                setTransactions(data);
                setError(null);
            } catch (err) {
                console.error("Error fetching live transactions:", err);
                setError("Failed to load live transactions");
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();

        // Set up polling to refresh transactions every 10 seconds
        const interval = setInterval(fetchTransactions, 10000);

        return () => clearInterval(interval);
    }, []);

    return (
        <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
            <CardHeader>
                <CardTitle className="text-2xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                    Live Network Activity
                </CardTitle>
                <CardDescription className="text-white/70">
                    Recent transactions on the network
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading && transactions.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                        <p className="mt-2 text-white/70">Loading transactions...</p>
                    </div>
                ) : error && transactions.length === 0 ? (
                    <div className="text-center py-8 text-red-400">
                        {error}
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-8 text-white/70">
                        No recent transactions
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {transactions.map((tx, index) => (
                            <div
                                key={tx.hash || index}
                                className="p-4 rounded-lg bg-white/5 border border-white/10"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded text-xs ${tx.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                                                tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    tx.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                {tx.status}
                                            </span>
                                            {tx.batchId && (
                                                <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400">
                                                    Batch #{tx.batchId}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-2 text-sm">
                                            <div className="text-white/70">
                                                From: <span className="text-white">{tx.from}</span>
                                            </div>
                                            <div className="text-white/70">
                                                To: <span className="text-white">{tx.to}</span>
                                            </div>
                                            <div className="text-white/70">
                                                Amount: <span className="text-white">{tx.value} ETH</span>
                                            </div>
                                            <div className="text-white/70 text-xs">
                                                {formatDistanceToNow(new Date(tx.createdAt * 1000), { addSuffix: true })}
                                            </div>
                                        </div>
                                    </div>
                                    {tx.hash && (
                                        <a
                                            href={`https://etherscan.io/tx/${tx.hash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-purple-400 hover:text-purple-300"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 