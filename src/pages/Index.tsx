import Navbar from "@/components/Navbar";
import NetworkStatus from "@/components/NetworkStatus";
import BatchSubmission from "@/components/BatchSubmission";
import TransactionTracker from "@/components/TransactionTracker";
import DepositCard from "@/components/DepositCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";

const Index = () => {
  const [wallet, setWallet] = useState<{
    address: string;
    network: string;
  } | null>(null);

  useEffect(() => {
    // Check if wallet is connected (using window.ethereum)
    const checkWalletConnection = () => {
      if (window.ethereum && window.ethereum.selectedAddress) {
        setWallet({
          address: window.ethereum.selectedAddress,
          network: window.ethereum.networkVersion === "11155111" ? "Sepolia" : "Unknown",
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
                <p className="text-white/70">
                  Connect your MetaMask wallet to use the Layer 2 features
                </p>
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
