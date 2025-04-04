import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@/hooks/useWallet";
import { getBatches } from "@/lib/ethers";
import { useEffect, useState } from "react";

interface Batch {
    id: number;
    transactions: string[];
    status: 'pending' | 'submitted' | 'confirmed';
    timestamp: number;
}

export default function TransactionFlow() {
    const { isConnected } = useWallet();
    const [batches, setBatches] = useState<Batch[]>([]);

    useEffect(() => {
        const fetchBatches = async () => {
            const fetchedBatches = await getBatches();
            setBatches(fetchedBatches);
        };

        fetchBatches();
        const interval = setInterval(fetchBatches, 10000);
        return () => clearInterval(interval);
    }, []);

    if (!isConnected) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Layer 2 Transaction Flow</CardTitle>
                <CardDescription>See how your transactions move through the system</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-8">
                    {/* Layer 1 to Layer 2 Deposit */}
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                            <span className="text-white font-bold">1</span>
                        </div>
                        <div>
                            <h3 className="font-semibold">Deposit to Layer 2</h3>
                            <p className="text-sm text-gray-500">Lock ETH in Layer 1 contract to get Layer 2 balance</p>
                        </div>
                    </div>

                    {/* Layer 2 Transactions */}
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                            <span className="text-white font-bold">2</span>
                        </div>
                        <div>
                            <h3 className="font-semibold">Layer 2 Transactions</h3>
                            <p className="text-sm text-gray-500">Make transactions on Layer 2 with no gas fees</p>
                        </div>
                    </div>

                    {/* Batch Submission */}
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                            <span className="text-white font-bold">3</span>
                        </div>
                        <div>
                            <h3 className="font-semibold">Batch Submission</h3>
                            <p className="text-sm text-gray-500">Admin collects transactions into batches</p>
                        </div>
                    </div>

                    {/* Batch Verification */}
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                            <span className="text-white font-bold">4</span>
                        </div>
                        <div>
                            <h3 className="font-semibold">Batch Verification</h3>
                            <p className="text-sm text-gray-500">Admin verifies batch validity</p>
                        </div>
                    </div>

                    {/* Batch Finalization */}
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                            <span className="text-white font-bold">5</span>
                        </div>
                        <div>
                            <h3 className="font-semibold">Batch Finalization</h3>
                            <p className="text-sm text-gray-500">Transactions are confirmed on Layer 1</p>
                        </div>
                    </div>

                    {/* Current Batches */}
                    <div className="mt-8">
                        <h3 className="font-semibold mb-4">Current Batches</h3>
                        <div className="space-y-4">
                            {batches.map((batch) => (
                                <div key={batch.id} className="p-4 border rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-medium">Batch #{batch.id}</p>
                                            <p className="text-sm text-gray-500">
                                                {batch.transactions.length} transactions
                                            </p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-sm ${batch.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                            batch.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                            {batch.status}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
} 