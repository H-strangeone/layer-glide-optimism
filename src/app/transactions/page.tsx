import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@/hooks/useWallet";
import { TransactionHistory } from "@/components/TransactionHistory";
import { LiveTransactions } from "@/components/LiveTransactions";

export default function TransactionsPage() {
    const { address, isConnected } = useWallet();

    return (
        <div className="container mx-auto py-8 space-y-8">
            <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                Transactions
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
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

                <div>
                    <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
                        <CardHeader>
                            <CardTitle className="text-xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                                Live Transactions
                            </CardTitle>
                            <CardDescription className="text-white/70">
                                View recent transactions on the network
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <LiveTransactions />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
} 