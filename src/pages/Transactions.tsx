import { useState } from 'react';
import { BatchManager } from "@/components/BatchManager";
import { TransactionTracker } from "@/components/TransactionTracker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { getLayer2Balance } from "@/lib/ethers";

export default function Transactions() {
  const [searchAddress, setSearchAddress] = useState("");
  const [balance, setBalance] = useState("0");

  const handleSearch = async () => {
    if (!searchAddress) return;

    try {
      const l2Balance = await getLayer2Balance(searchAddress);
      setBalance(l2Balance);
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-primary">Transactions</h1>
      <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
        <CardHeader>
          <CardTitle className="text-2xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Search Transactions
          </CardTitle>
          <CardDescription className="text-white/70">
            View transaction history and balance for any wallet address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="Enter wallet address (0x...)"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              className="bg-white/5 border-white/10 text-white flex-1"
            />
            <Button
              onClick={handleSearch}
              className="bg-purple-500 hover:bg-purple-600"
            >
              Search
            </Button>
          </div>
          {searchAddress && (
            <div className="bg-white/5 p-4 rounded-lg border border-white/10 backdrop-blur-sm mb-4">
              <div className="text-sm text-white/70 mb-1">Layer 2 Balance</div>
              <div className="text-xl font-medium text-white">
                {Number(balance).toFixed(4)} ETH
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <TransactionTracker mode="network" address={searchAddress} />
    </div>
  );
}
