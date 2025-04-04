import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { getUserBalance, getLayer1Balance, getLayer2Balance, withdrawFunds } from "@/lib/ethers";
import { useEffect, useState } from "react";
import { useWallet } from "@/hooks/useWallet";

const Withdraw = () => {
  const { address, isConnected } = useWallet();
  const [layer1Balance, setLayer1Balance] = useState<string>("0");
  const [layer2Balance, setLayer2Balance] = useState<string>("0");
  const [amount, setAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const updateBalances = async () => {
      if (!isConnected || !address) return;

      try {
        const l1Balance = await getLayer1Balance(address);
        const l2Balance = await getLayer2Balance(address);

        setLayer1Balance(l1Balance || "0");
        setLayer2Balance(l2Balance || "0");
      } catch (error) {
        console.error("Failed to fetch balances:", error);
        setLayer1Balance("0");
        setLayer2Balance("0");
      }
    };

    updateBalances();
    const interval = setInterval(updateBalances, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [address, isConnected]);

  const handleWithdraw = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to withdraw funds",
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

    if (Number(amount) > Number(layer2Balance)) {
      toast({
        title: "Insufficient Balance",
        description: `Your L2 balance (${Number(layer2Balance).toFixed(4)} ETH) is less than the requested amount`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsWithdrawing(true);
      await withdrawFunds(amount);
      toast({
        title: "Withdrawal Initiated",
        description: `Successfully initiated withdrawal of ${amount} ETH to Layer 1`,
      });

      // Refresh balances after withdrawal
      if (address) {
        const l1Balance = await getLayer1Balance(address);
        const l2Balance = await getLayer2Balance(address);
        setLayer1Balance(l1Balance);
        setLayer2Balance(l2Balance);
      }

      setAmount("");
    } catch (error) {
      console.error("Withdrawal error:", error);
      toast({
        title: "Withdrawal Failed",
        description: error instanceof Error ? error.message : "Failed to withdraw funds",
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const setMaxAmount = () => {
    setAmount(layer2Balance);
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="glass-card">
          <CardContent className="py-8">
            <div className="text-center text-white/70">
              Please connect your wallet to withdraw funds
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
          Withdraw From Layer 2
        </h1>
        <p className="text-lg text-white/70">
          Move your funds back to the Ethereum mainnet securely and efficiently
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
            <CardHeader>
              <CardTitle className="text-2xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                Withdraw to Layer 1
              </CardTitle>
              <CardDescription className="text-white/70">
                Withdrawals are processed immediately but may take 1-2 minutes to finalize
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
                    <label className="text-sm text-white/70">Amount to Withdraw (ETH)</label>
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
                    disabled={isWithdrawing}
                  />
                </div>

                <Button
                  onClick={handleWithdraw}
                  disabled={isWithdrawing || !amount}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all duration-200"
                >
                  {isWithdrawing ? (
                    <>
                      <span className="mr-2">Withdrawing...</span>
                      <Progress value={25} className="w-20 h-2 bg-white/10" />
                    </>
                  ) : (
                    "Withdraw to Layer 1"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
            <CardHeader>
              <CardTitle className="text-xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                How Withdrawals Work
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-white/70">
                <div>
                  <h3 className="font-medium text-white mb-1">Secure Withdrawals</h3>
                  <p>When you withdraw from Layer 2, the funds are transferred back to your Layer 1 wallet address.</p>
                </div>
                <div>
                  <h3 className="font-medium text-white mb-1">Withdrawal Process</h3>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Initiate a withdrawal request from this interface.</li>
                    <li>The Layer 2 contract verifies your balance.</li>
                    <li>Funds are transferred from the Layer 2 contract to your wallet.</li>
                    <li>Transaction is finalized on-chain.</li>
                  </ol>
                </div>
                <div>
                  <h3 className="font-medium text-white mb-1">Important Notes</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Withdrawals are processed immediately but may take 1-2 minutes to finalize.</li>
                    <li>Gas fees apply for the withdrawal transaction.</li>
                    <li>You can only withdraw funds that have been fully verified on Layer 2.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Withdraw;
