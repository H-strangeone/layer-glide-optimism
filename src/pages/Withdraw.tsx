import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { getUserBalance, withdrawFunds } from "@/lib/ethers";
import { useEffect, useState } from "react";

const Withdraw = () => {
  const [wallet, setWallet] = useState<{
    address: string;
    ethBalance: string;
    l2Balance: string;
  } | null>(null);
  const [amount, setAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already connected
    const checkConnection = async () => {
      try {
        if (window.ethereum && window.ethereum.selectedAddress) {
          const address = window.ethereum.selectedAddress;
          const balances = await getUserBalance(address);

          setWallet({
            address,
            ethBalance: balances.ethBalance,
            l2Balance: balances.l2Balance,
          });
        }
      } catch (error) {
        console.error("Connection check failed:", error);
      }
    };

    checkConnection();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", async (accounts: string[]) => {
        if (accounts.length === 0) {
          setWallet(null);
        } else {
          const balances = await getUserBalance(accounts[0]);
          setWallet({
            address: accounts[0],
            ethBalance: balances.ethBalance,
            l2Balance: balances.l2Balance,
          });
        }
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners("accountsChanged");
      }
    };
  }, []);

  const handleWithdraw = async () => {
    if (!wallet) {
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

    if (Number(amount) > Number(wallet.l2Balance)) {
      toast({
        title: "Insufficient Balance",
        description: `Your L2 balance (${wallet.l2Balance} ETH) is less than the requested amount`,
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

      // Refresh balance after withdrawal
      if (wallet.address) {
        const balances = await getUserBalance(wallet.address);
        setWallet({
          ...wallet,
          ethBalance: balances.ethBalance,
          l2Balance: balances.l2Balance,
        });
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
    if (wallet) {
      setAmount(wallet.l2Balance);
    }
  };

  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-l2-primary to-l2-secondary bg-clip-text text-transparent">
          Withdraw From Layer 2
        </h1>
        <p className="text-lg text-white/70">
          Move your funds back to the Ethereum mainnet securely and efficiently
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="glass-card w-full">
            <CardHeader>
              <CardTitle className="text-2xl text-l2-primary">Withdraw to Layer 1</CardTitle>
              <CardDescription>
                Withdrawals are processed immediately but may take 1-2 minutes to finalize
              </CardDescription>
            </CardHeader>
            <CardContent>
              {wallet ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-black/20 p-4 rounded-lg border border-white/10">
                      <div className="text-sm text-white/70 mb-1">Layer 1 Balance</div>
                      <div className="text-xl font-medium">{Number(wallet.ethBalance).toFixed(6)} ETH</div>
                    </div>

                    <div className="bg-black/20 p-4 rounded-lg border border-white/10">
                      <div className="text-sm text-white/70 mb-1">Layer 2 Balance</div>
                      <div className="text-xl font-medium">{Number(wallet.l2Balance).toFixed(6)} ETH</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm text-white/70">Amount to Withdraw (ETH)</label>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={setMaxAmount}
                        className="text-l2-primary p-0 h-auto"
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
                      className="bg-black/20 border-white/10"
                      disabled={isWithdrawing}
                    />
                  </div>

                  <div>
                    <Button
                      onClick={handleWithdraw}
                      disabled={isWithdrawing || !amount}
                      className="w-full bg-gradient-to-r from-l2-primary to-l2-secondary text-white"
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
                </div>
              ) : (
                <div className="py-8 text-center text-white/60">
                  Please connect your wallet to withdraw funds
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="glass-card w-full">
            <CardHeader>
              <CardTitle className="text-xl text-white">How Withdrawals Work</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-white/70">
                <div className="space-y-1">
                  <h3 className="font-medium text-white">Secure Withdrawals</h3>
                  <p>
                    When you withdraw from Layer 2, the funds are transferred back to your Layer 1 wallet address.
                    This is secured by the same smart contract that handles deposits.
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="font-medium text-white">Withdrawal Process:</h3>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Initiate a withdrawal request from this interface.</li>
                    <li>The Layer 2 contract verifies your balance.</li>
                    <li>Funds are transferred from the Layer 2 contract to your wallet.</li>
                    <li>Transaction is finalized on-chain.</li>
                  </ol>
                </div>

                <div className="space-y-1">
                  <h3 className="font-medium text-white">Important Notes:</h3>
                  <ul className="list-disc pl-5 space-y-1">
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
};

export default Withdraw;
