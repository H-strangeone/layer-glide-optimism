
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { depositFunds } from "@/lib/ethers";
import { useState } from "react";

interface DepositCardProps {
  address?: string;
  onDepositSuccess?: () => void;
}

const DepositCard = ({ address, onDepositSuccess }: DepositCardProps) => {
  const [amount, setAmount] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const { toast } = useToast();

  const handleDeposit = async () => {
    if (!address) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to deposit funds",
        variant: "destructive",
      });
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDepositing(true);
      await depositFunds(amount);
      toast({
        title: "Deposit Successful",
        description: `Successfully deposited ${amount} ETH to Layer 2`,
      });
      setAmount("");
      if (onDepositSuccess) {
        onDepositSuccess();
      }
    } catch (error) {
      console.error("Deposit error:", error);
      toast({
        title: "Deposit Failed",
        description: error instanceof Error ? error.message : "Failed to deposit funds",
        variant: "destructive",
      });
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <Card className="glass-card w-full">
      <CardHeader>
        <CardTitle className="text-xl text-white">Deposit to Layer 2</CardTitle>
        <CardDescription>Move your funds to Layer 2 for faster and cheaper transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-white/70 mb-1 block">Amount (ETH)</label>
            <Input
              type="number"
              placeholder="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.0001"
              className="bg-black/20 border-white/10"
              disabled={!address || isDepositing}
            />
          </div>
          
          <div className="pt-2">
            <Button
              onClick={handleDeposit}
              disabled={!address || isDepositing}
              className="w-full bg-gradient-to-r from-l2-primary to-l2-secondary text-white"
            >
              {isDepositing ? "Depositing..." : "Deposit to Layer 2"}
            </Button>
          </div>
          
          <div className="text-xs text-white/60 pt-2">
            <p>• Deposits are processed immediately</p>
            <p>• Funds will be available on Layer 2 after 1 block confirmation</p>
            <p>• Gas fees will apply for the deposit transaction</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DepositCard;
