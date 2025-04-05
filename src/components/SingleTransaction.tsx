import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { executeL2Transaction, getLayer2Balance } from "@/lib/ethers";
import { toast } from "@/components/ui/use-toast";

export default function SingleTransaction() {
    const { address, isConnected } = useWallet();
    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!recipient || !amount) {
            toast({
                title: "Invalid Input",
                description: "Please enter both recipient address and amount",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            await executeL2Transaction(recipient, amount);
            toast({
                title: "Transaction Submitted",
                description: "Your Layer 2 transfer has been submitted successfully",
            });

            setRecipient("");
            setAmount("");
        } catch (error) {
            console.error("Transaction error:", error);
            toast({
                title: "Transaction Failed",
                description: "Failed to submit transaction",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
            <CardHeader>
                <CardTitle className="text-2xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Single Transaction</CardTitle>
                <CardDescription className="text-white/70">Send funds to another address on Layer 2</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Input
                        placeholder="Recipient Address (0x...)"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                        disabled={isLoading}
                    />
                    <Input
                        type="number"
                        placeholder="Amount in ETH"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min="0"
                        step="0.01"
                        className="bg-white/5 border-white/10 text-white"
                        disabled={isLoading}
                    />
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading || !recipient || !amount}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all duration-200"
                    >
                        {isLoading ? "Processing..." : "Submit Transaction"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
} 