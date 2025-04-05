import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "@/components/ui/use-toast";

const Navbar: React.FC = () => {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!address) return;

      try {
        const response = await fetch(`http://localhost:5500/api/admin/check?address=${address}`);
        const data = await response.json();
        setIsAdmin(data.isAdmin);
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkAdminStatus();
  }, [address]);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error("Connection failed:", error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  return (
    <nav className="backdrop-blur-md bg-black/30 border-b border-white/10">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link
              to="/"
              className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 bg-clip-text text-transparent hover:from-purple-500 hover:via-pink-600 hover:to-purple-700 transition-all duration-300"
            >
              Layer 2 Scaling
            </Link>
            {isConnected && (
              <div className="flex space-x-6">
                <Link
                  to="/transactions"
                  className="text-white/70 hover:text-white transition-colors duration-200"
                >
                  Transactions
                </Link>
                <Link
                  to="/batches"
                  className="text-white/70 hover:text-white transition-colors duration-200"
                >
                  Batches
                </Link>
                <Link
                  to="/withdraw"
                  className="text-white/70 hover:text-white transition-colors duration-200"
                >
                  Withdraw
                </Link>
                <Link
                  to="/fraud-proof"
                  className="text-white/70 hover:text-white transition-colors duration-200"
                >
                  Fraud Proof
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="text-white/70 hover:text-white transition-colors duration-200"
                  >
                    Admin
                  </Link>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {isConnected ? (
              <>
                <span className="text-sm text-white/70 bg-white/5 px-3 py-1 rounded-full">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                <Button
                  variant="outline"
                  onClick={disconnect}
                  className="border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-colors duration-200"
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all duration-200"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
