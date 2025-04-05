"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/hooks/useWallet";
import { getLayer1Balance, getLayer2Balance } from "@/lib/ethers";
import { TransactionHistory } from "@/components/TransactionHistory";

export default function Home() {
    const { address, isConnected } = useWallet();
    const [layer1Balance, setLayer1Balance] = useState<string>("0");
    const [layer2Balance, setLayer2Balance] = useState<string>("0");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBalances = async () => {
            if (!isConnected || !address) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const [l1Balance, l2Balance] = await Promise.all([
                    getLayer1Balance(address),
                    getLayer2Balance(address)
                ]);

                setLayer1Balance(l1Balance);
                setLayer2Balance(l2Balance);
                setError(null);
            } catch (err) {
                console.error("Error fetching balances:", err);
                setError("Failed to load balances");
            } finally {
                setLoading(false);
            }
        };

        fetchBalances();

        // Refresh balances every 30 seconds
        const interval = setInterval(fetchBalances, 30000);

        return () => clearInterval(interval);
    }, [isConnected, address]);

    return (
        <div className="container mx-auto py-8 space-y-8">
            <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                Layer 2 Scaling Solution
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
                    <CardHeader>
                        <CardTitle className="text-xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                            Layer 1 Balance
                        </CardTitle>
                        <CardDescription className="text-white/70">
                            Your Ethereum mainnet balance
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                                <p className="mt-2 text-white/70">Loading balance...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-8 text-red-400">
                                {error}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="text-4xl font-bold text-white">{layer1Balance} ETH</div>
                                <p className="mt-2 text-white/70">on Ethereum mainnet</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
                    <CardHeader>
                        <CardTitle className="text-xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                            Layer 2 Balance
                        </CardTitle>
                        <CardDescription className="text-white/70">
                            Your Layer 2 scaling solution balance
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                                <p className="mt-2 text-white/70">Loading balance...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-8 text-red-400">
                                {error}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="text-4xl font-bold text-white">{layer2Balance} ETH</div>
                                <p className="mt-2 text-white/70">on Layer 2 scaling solution</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
                <CardHeader>
                    <CardTitle className="text-xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                        Your Transaction History
                    </CardTitle>
                    <CardDescription className="text-white/70">
                        {isConnected ? "View your recent transactions" : "Connect your wallet to view your transactions"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isConnected ? (
                        <TransactionHistory />
                    ) : (
                        <div className="text-center py-8 text-white/70">
                            Please connect your wallet to view your transaction history
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}