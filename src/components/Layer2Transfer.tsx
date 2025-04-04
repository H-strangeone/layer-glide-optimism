import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { getContract, getLayer2Balance } from "@/lib/ethers";
import { toast } from "@/components/ui/use-toast";
import { parseEther } from "ethers";

export default function Layer2Transfer() {
    const { address, isConnected } = useWallet();
    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleTransfer = async () => {
        if (!isConnected || !address || !recipient || !amount) return;

        setIsLoading(true);
        try {
            // First check Layer 2 balance
            const balance = await getLayer2Balance(address);
            if (parseFloat(balance) < parseFloat(amount)) {
                toast({
                    title: "Insufficient Balance",
                    description: `Your Layer 2 balance (${balance} ETH) is less than the transfer amount`,
                    variant: "destructive",
                });
                return;
            }

            // Create the transaction in the database first
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: address,
                    to: recipient,
                    amount,
                    type: 'transfer',
                    layer: 'layer2',
                    status: 'pending'
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create transaction record');
            }

            toast({
                title: "Transfer Initiated",
                description: "Your transfer has been queued for the next batch",
            });

            // Clear form
            setRecipient("");
            setAmount("");
        } catch (error) {
            console.error('Transfer error:', error);
            toast({
                title: "Transfer Failed",
                description: error instanceof Error ? error.message : "Failed to initiate transfer",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isConnected) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Layer 2 Transfer</CardTitle>
                <CardDescription>Send funds to another address on Layer 2</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            placeholder="Recipient Address (0x...)"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            disabled={isLoading}
                        />
                        <Input
                            type="number"
                            placeholder="Amount in ETH"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="0"
                            step="0.01"
                            disabled={isLoading}
                        />
                    </div>
                    <Button
                        onClick={handleTransfer}
                        disabled={isLoading || !recipient || !amount}
                        className="w-full bg-purple-500 hover:bg-purple-600"
                    >
                        {isLoading ? "Processing..." : "Transfer"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
} 