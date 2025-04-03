
import Navbar from "@/components/Navbar";
import NetworkStatus from "@/components/NetworkStatus";
import BatchSubmission from "@/components/BatchSubmission";
import TransactionTracker from "@/components/TransactionTracker";
import DepositCard from "@/components/DepositCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { getNetworkName, connectWallet, switchNetwork } from "@/lib/ethers";
import { toast } from "@/components/ui/use-toast";

const Index = () => {
  const [wallet, setWallet] = useState<{
    address: string;
    network: string;
  } | null>(null);
  
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Check if wallet is connected (using window.ethereum)
    const checkWalletConnection = async () => {
      if (window.ethereum && window.ethereum.selectedAddress) {
        const chainId = await window.ethereum.request({ method: "eth_chainId" });
        const networkName = getNetworkName(chainId);
        
        setWallet({
          address: window.ethereum.selectedAddress,
          network: networkName === "sepolia" ? "Sepolia" : 
                  networkName === "localhost" ? "Localhost" : "Unknown",
        });
      } else {
        setWallet(null);
      }
    };

    checkWalletConnection();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", checkWalletConnection);
      window.ethereum.on("chainChanged", checkWalletConnection);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", checkWalletConnection);
        window.ethereum.removeListener("chainChanged", checkWalletConnection);
      }
    };
  }, []);

  // Force a refresh when deposits are made to update balances
  const handleDepositSuccess = () => {
    // This would trigger a refresh of balances in a real implementation
    console.log("Deposit successful, refreshing data...");
  };

  const handleConnectWallet = async () => {
    try {
      setIsConnecting(true);
      const result = await connectWallet();
      setWallet({
        address: result.address,
        network: result.network,
      });
      
      if (result.network !== "sepolia") {
        toast({
          title: "Wrong Network",
          description: "Please switch to Sepolia network",
          variant: "destructive",
        });
        
        const switched = await switchNetwork("sepolia");
        if (switched) {
          toast({
            title: "Network Switched",
            description: "Successfully connected to Sepolia",
          });
        }
      }
    } catch (error) {
      console.error("Connection error:", error);
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-l2-bg">
      <div className="container mx-auto px-4 pb-12">
        <Navbar />
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-l2-primary to-l2-secondary bg-clip-text text-transparent">
            Layer 2 Optimistic Rollup
          </h1>
          <p className="text-lg text-white/70">
            Experience faster and cheaper transactions with our Ethereum Layer 2 scaling solution
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <NetworkStatus network={wallet?.network} />
            
            {wallet?.address ? (
              <>
                <BatchSubmission />
                <TransactionTracker address={wallet.address} />
              </>
            ) : (
              <div className="glass-card w-full mt-6 p-8 text-center">
                <h2 className="text-xl mb-4">Connect Your Wallet</h2>
                <p className="text-white/70 mb-6">
                  Connect your MetaMask wallet to use the Layer 2 features.
                  Make sure you have set up your .env file with your Alchemy API key and private key.
                </p>
                <Button 
                  onClick={handleConnectWallet} 
                  disabled={isConnecting}
                  className="bg-gradient-to-r from-l2-primary to-l2-secondary hover:opacity-90"
                >
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </Button>
              </div>
            )}
          </div>
          
          <div>
            <DepositCard 
              address={wallet?.address} 
              onDepositSuccess={handleDepositSuccess} 
            />

            <Card className="glass-card w-full mt-6">
              <CardHeader>
                <CardTitle className="text-xl text-white">How It Works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm text-white/70">
                  <div className="space-y-1">
                    <h3 className="font-medium text-white">1. Deposit</h3>
                    <p>Move your funds to Layer 2 to benefit from lower gas fees and faster transactions.</p>
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="font-medium text-white">2. Transact</h3>
                    <p>Submit single transactions or batches of transactions to save on gas costs.</p>
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="font-medium text-white">3. Verification</h3>
                    <p>Transactions are processed immediately off-chain and securely verified on-chain.</p>
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="font-medium text-white">4. Withdraw</h3>
                    <p>Withdraw your funds back to Layer 1 whenever you need them.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
