import React, { useEffect, useState } from 'react';
import { getGasPrice, getBatches, getProvider } from '@/lib/ethers';
import { formatUnits } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function NetworkStatus() {
  const [networkInfo, setNetworkInfo] = useState({
    gasPrice: "0",
    blockHeight: 0,
    batchCount: 0,
    pendingTxs: 0,
    networkName: "Unknown",
  });
  const [loading, setLoading] = useState(true);

  const getNetworkName = async (chainId: string) => {
    const chainIdNum = parseInt(chainId, 16);
    switch (chainIdNum) {
      case 31337:
        return "Hardhat";
      case 11155111:
        return "Sepolia";
      default:
        return `Chain ${chainIdNum}`;
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const provider = await getProvider();

      // Get network info
      const chainId = await provider.send('eth_chainId', []);
      const networkName = await getNetworkName(chainId);

      // Get gas price (returns hex string)
      const gasPriceHex = await getGasPrice();
      // Convert hex gas price to gwei
      const gasPriceGwei = formatUnits(gasPriceHex, 'gwei');

      // Get latest block
      const blockNumber = await provider.getBlockNumber();

      // Get batch count
      const batches = await getBatches();

      // Get pending transactions (simplified)
      const block = await provider.getBlock('latest');
      const pendingTxs = block?.transactions?.length || 0;

      setNetworkInfo({
        gasPrice: gasPriceGwei,
        blockHeight: blockNumber,
        batchCount: batches.length,
        pendingTxs,
        networkName,
      });
    } catch (error) {
      console.error("Error fetching network status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Network Status</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading network status...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium">Network</p>
              <p className="text-2xl font-bold">{networkInfo.networkName}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Gas Price</p>
              <p className="text-2xl font-bold">{parseFloat(networkInfo.gasPrice).toFixed(2)} Gwei</p>
            </div>
            <div>
              <p className="text-sm font-medium">Block Height</p>
              <p className="text-2xl font-bold">{networkInfo.blockHeight}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Batch Count</p>
              <p className="text-2xl font-bold">{networkInfo.batchCount}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Pending Transactions</p>
              <p className="text-2xl font-bold">{networkInfo.pendingTxs}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
