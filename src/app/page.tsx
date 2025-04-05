"use client";

import { useWallet } from "@/hooks/useWallet";
import DepositCard from "@/components/DepositCard";
import BatchSubmission from "@/components/BatchSubmission";
import { TransactionTracker } from "@/components/TransactionTracker";
import AdminPanel from "@/components/AdminPanel";
import TransactionFlow from "@/components/TransactionFlow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
    const { isConnected } = useWallet();

    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold text-purple-400">Welcome to L2 Optimistic Rollup</h1>
                    <p className="text-xl text-gray-400">Connect your wallet to get started</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Transaction Flow */}
            <TransactionFlow />

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-8">
                    <DepositCard />
                    <Card>
                        <CardHeader>
                            <CardTitle>Layer 2 Transfer</CardTitle>
                            <CardDescription>Send ETH on Layer 2</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <BatchSubmission />
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                    <AdminPanel />
                </div>
            </div>

            {/* Transaction History at the bottom */}
            <TransactionTracker mode="user" />
        </div>
    );
} 