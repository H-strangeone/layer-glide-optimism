import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { depositFunds } from "@/lib/ethers";
import { toast } from "@/components/ui/use-toast";

interface DepositCardProps {
  onSuccess?: () => void;
}

export default function DepositCard({ onSuccess }: DepositCardProps) {
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await depositFunds(amount);
      toast({
        title: "Success",
        description: `Successfully deposited ${amount} ETH`,
      });
      setAmount("");
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Deposit error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to deposit funds",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Deposit to Layer 2</CardTitle>
        <CardDescription>
          Deposit ETH from Layer 1 to Layer 2
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex space-x-4">
            <Input
              type="number"
              placeholder="Amount in ETH"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
              disabled={isLoading}
            />
            <Button
              onClick={handleDeposit}
              disabled={isLoading || !amount}
            >
              {isLoading ? "Depositing..." : "Deposit"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
