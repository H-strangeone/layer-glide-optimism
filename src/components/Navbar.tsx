import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { connectWallet, getUserBalance, switchNetwork, getNetworkName, disconnectWallet, getGasPrice } from "@/lib/ethers";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [wallet, setWallet] = useState<{
    address: string;
    network: string;
    ethBalance: string;
    l2Balance: string;
    gasPrice: string;
  } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  // Update gas price and balances periodically
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateWalletInfo = async () => {
      if (wallet?.address) {
        try {
          const balances = await getUserBalance(wallet.address);
          const gasPrice = await getGasPrice();
          setWallet(prev => prev ? {
            ...prev,
            ethBalance: balances.ethBalance,
            l2Balance: balances.l2Balance,
            gasPrice: gasPrice
          } : null);
        } catch (error) {
          console.error("Error updating wallet info:", error);
        }
      }
    };

    if (wallet?.address) {
      updateWalletInfo();
      interval = setInterval(updateWalletInfo, 10000); // Update every 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [wallet?.address]);

  useEffect(() => {
    // Check if user is already connected
    const checkConnection = async () => {
      try {
        if (window.ethereum && window.ethereum.selectedAddress) {
          const chainId = await window.ethereum.request({ method: "eth_chainId" });
          const networkName = getNetworkName(chainId);

          const result = await connectWallet();
          const balances = await getUserBalance(result.address);
          const gasPrice = await getGasPrice();
          setWallet({
            ...result,
            ethBalance: balances.ethBalance,
            l2Balance: balances.l2Balance,
            gasPrice: gasPrice
          });

          // Automatically try to switch to Sepolia if on unknown network
          if (networkName === "unknown") {
            await switchNetwork("sepolia");
          }
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
          await disconnectWallet();
        } else {
          const result = await connectWallet();
          const balances = await getUserBalance(result.address);
          const gasPrice = await getGasPrice();
          setWallet({
            ...result,
            ethBalance: balances.ethBalance,
            l2Balance: balances.l2Balance,
            gasPrice: gasPrice
          });
        }
      });

      window.ethereum.on("chainChanged", async (chainId: string) => {
        const networkName = getNetworkName(chainId);
        if (window.ethereum.selectedAddress) {
          const result = await connectWallet();
          const balances = await getUserBalance(result.address);
          const gasPrice = await getGasPrice();
          setWallet({
            ...result,
            ethBalance: balances.ethBalance,
            l2Balance: balances.l2Balance,
            gasPrice: gasPrice
          });
        }
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners("accountsChanged");
        window.ethereum.removeAllListeners("chainChanged");
      }
    };
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const result = await connectWallet();
      const balances = await getUserBalance(result.address);
      const gasPrice = await getGasPrice();
      setWallet({
        ...result,
        ethBalance: balances.ethBalance,
        l2Balance: balances.l2Balance,
        gasPrice: gasPrice
      });
      toast({
        title: "Wallet Connected",
        description: `Connected to ${result.address.slice(0, 6)}...${result.address.slice(-4)}`,
      });
    } catch (error) {
      console.error("Connection failed:", error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
      setWallet(null);
      toast({
        title: "Wallet Disconnected",
        description: "Successfully disconnected wallet",
      });
    } catch (error) {
      console.error("Disconnection failed:", error);
      toast({
        title: "Disconnection Failed",
        description: error instanceof Error ? error.message : "Failed to disconnect wallet",
        variant: "destructive",
      });
    }
  };

  const handleSwitchToSepolia = async () => {
    const success = await switchNetwork("sepolia");
    if (success) {
      toast({
        title: "Network Switched",
        description: "Successfully switched to Sepolia testnet",
      });
    } else {
      toast({
        title: "Network Switch Failed",
        description: "Failed to switch to Sepolia testnet",
        variant: "destructive",
      });
    }
  };

  return (
    <nav className="w-full py-4 px-6 flex justify-between items-center glass-card mb-6">
      <div className="flex items-center space-x-2">
        <Link to="/" className="text-xl font-bold bg-gradient-to-r from-l2-primary to-l2-secondary bg-clip-text text-transparent">
          L2 Optimistic Rollup
        </Link>
      </div>

      <div className="hidden md:flex items-center space-x-6">
        <Link to="/" className="text-white/80 hover:text-white transition-colors">
          Home
        </Link>
        <Link to="/transactions" className="text-white/80 hover:text-white transition-colors">
          Transactions
        </Link>
        <Link to="/withdraw" className="text-white/80 hover:text-white transition-colors">
          Withdraw
        </Link>
        <Link to="/admin" className="text-white/80 hover:text-white transition-colors">
          Admin
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        {wallet ? (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-white/80">
              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisconnect}
              className="bg-red-500/10 text-red-500 hover:bg-red-500/20"
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="bg-l2-primary/10 text-l2-primary hover:bg-l2-primary/20"
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </Button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
