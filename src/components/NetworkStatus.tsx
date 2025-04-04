import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@/hooks/useWallet";
import { getGasPrice, getNetworkName } from "@/lib/ethers";
import { formatEther } from "ethers";

export default function NetworkStatus() {
  const { address, isConnected } = useWallet();
  const [gasPrice, setGasPrice] = useState<string>("0");
  const [blockNumber, setBlockNumber] = useState<number>(0);
  const [networkName, setNetworkName] = useState<string>("");

  useEffect(() => {
    const updateNetworkInfo = async () => {
      if (!window.ethereum) return;

      try {
        // Get network name
        const chainId = await window.ethereum.request({ method: "eth_chainId" });
        const name = getNetworkName(chainId);
        setNetworkName(name);

        // Get gas price
        const price = await getGasPrice();
        setGasPrice(formatEther(price));

        // Get latest block number
        const provider = await window.ethereum.request({
          method: "eth_blockNumber",
        });
        setBlockNumber(Number(provider));
      } catch (error) {
        console.error("Error updating network info:", error);
      }
    };

    updateNetworkInfo();
    const interval = setInterval(updateNetworkInfo, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  if (!isConnected) return null;

  return (
    <Card className="w-full max-w-md mx-auto mb-6 glass-card">
      <CardHeader>
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-l2-primary to-l2-secondary bg-clip-text text-transparent">
          Network Status
        </CardTitle>
        <CardDescription className="text-white/80">
          Current network information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-white/80">Network:</span>
            <span className="font-medium text-white">{networkName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/80">Gas Price:</span>
            <span className="font-medium text-white">{gasPrice} ETH</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/80">Block Number:</span>
            <span className="font-medium text-white">{blockNumber}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
