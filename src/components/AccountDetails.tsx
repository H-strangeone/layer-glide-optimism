import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@/hooks/useWallet";
import { getLayer1Balance, getLayer2Balance } from "@/lib/ethers";
import TransactionHistory from './TransactionHistory';

export default function AccountDetails() {
    const { address, isConnected } = useWallet();
    const [layer1Balance, setLayer1Balance] = useState<string>("0");
    const [layer2Balance, setLayer2Balance] = useState<string>("0");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBalances = async () => {
            if (!address) return;

            setLoading(true);
            try {
                const l1Balance = await getLayer1Balance(address);
                const l2Balance = await getLayer2Balance(address);

                setLayer1Balance(l1Balance);
                setLayer2Balance(l2Balance);
            } catch (error) {
                console.error("Error fetching balances:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBalances();

        // Set up polling to refresh balances every 30 seconds
        const interval = setInterval(fetchBalances, 30000);

        return () => clearInterval(interval);
    }, [address]);

    if (!isConnected) {
        return (
            <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
                <CardContent className="py-8">
                    <div className="text-center text-white/70">
                        Please connect your wallet to view account details
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
                <CardHeader>
                    <CardTitle className="text-2xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                        Account Details
                    </CardTitle>
                    <CardDescription className="text-white/70">
                        Your wallet information and balances
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                            <div className="text-white/70">Address</div>
                            <div className="font-mono text-white break-all">{address}</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <div className="text-white/70">Layer 1 Balance</div>
                                {loading ? (
                                    <div className="animate-pulse h-6 bg-white/10 rounded w-24"></div>
                                ) : (
                                    <div className="text-2xl font-bold text-white">{layer1Balance} ETH</div>
                                )}
                            </div>

                            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <div className="text-white/70">Layer 2 Balance</div>
                                {loading ? (
                                    <div className="animate-pulse h-6 bg-white/10 rounded w-24"></div>
                                ) : (
                                    <div className="text-2xl font-bold text-white">{layer2Balance} ETH</div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <TransactionHistory />
        </div>
    );
} 