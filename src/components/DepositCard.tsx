import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { depositFunds, getLayer1Balance, getLayer2Balance } from "@/lib/ethers";
import { toast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";

export default function DepositCard() {
  const { address, isConnected } = useWallet();
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [layer1Balance, setLayer1Balance] = useState("0");
  const [layer2Balance, setLayer2Balance] = useState("0");

  useEffect(() => {
    const fetchBalances = async () => {
      if (!isConnected || !address) return;

      try {
        const l1Balance = await getLayer1Balance(address);
        const l2Balance = await getLayer2Balance(address);
        setLayer1Balance(l1Balance || "0");
        setLayer2Balance(l2Balance || "0");
      } catch (error) {
        console.error("Error fetching balances:", error);
        setLayer1Balance("0");
        setLayer2Balance("0");
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, [address, isConnected]);

  const handleDeposit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (Number(amount) > Number(layer1Balance)) {
      toast({
        title: "Insufficient Balance",
        description: `Your Layer 1 balance (${Number(layer1Balance).toFixed(4)} ETH) is less than the requested amount`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await depositFunds(amount);
      toast({
        title: "Deposit Successful",
        description: `Successfully deposited ${amount} ETH to Layer 2`,
      });
      setAmount("");

      // Refresh balances after deposit
      if (address) {
        const l1Balance = await getLayer1Balance(address);
        const l2Balance = await getLayer2Balance(address);
        setLayer1Balance(l1Balance || "0");
        setLayer2Balance(l2Balance || "0");
      }
    } catch (error) {
      console.error("Deposit error:", error);
      toast({
        title: "Deposit Failed",
        description: error instanceof Error ? error.message : "Failed to deposit funds",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setMaxAmount = () => {
    setAmount(layer1Balance);
  };

  if (!isConnected) {
    return (
      <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
        <CardContent className="py-8">
          <div className="text-center text-white/70">
            Please connect your wallet to deposit funds
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
      <CardHeader>
        <CardTitle className="text-2xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
          Deposit to Layer 2
        </CardTitle>
        <CardDescription className="text-white/70">
          Transfer ETH from Layer 1 to Layer 2
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 p-4 rounded-lg border border-white/10 backdrop-blur-sm">
              <div className="text-sm text-white/70 mb-1">Layer 1 Balance</div>
              <div className="text-xl font-medium text-white">
                {Number(layer1Balance).toFixed(4)} ETH
              </div>
            </div>
            <div className="bg-white/5 p-4 rounded-lg border border-white/10 backdrop-blur-sm">
              <div className="text-sm text-white/70 mb-1">Layer 2 Balance</div>
              <div className="text-xl font-medium text-white">
                {Number(layer2Balance).toFixed(4)} ETH
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm text-white/70">Amount to Deposit (ETH)</label>
              <Button
                variant="link"
                size="sm"
                onClick={setMaxAmount}
                className="text-purple-400 hover:text-purple-300 p-0 h-auto"
              >
                Max
              </Button>
            </div>
            <Input
              type="number"
              placeholder="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.0001"
              className="bg-white/5 border-white/10 text-white"
              disabled={isLoading}
            />
          </div>

          <Button
            onClick={handleDeposit}
            disabled={isLoading || !amount}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all duration-200"
          >
            {isLoading ? (
              <>
                <span className="mr-2">Depositing...</span>
                <Progress value={25} className="w-20 h-2 bg-white/10" />
              </>
            ) : (
              "Deposit to Layer 2"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
