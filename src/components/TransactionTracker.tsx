import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { getTransactionHistory, getLayer2Balance, getLayer1Balance, formatLargeNumber } from '@/lib/ethers';
import { formatDistanceToNow } from "date-fns";
import { formatEther } from "ethers";

interface TransactionTrackerProps {
  address?: string;
}

interface Transaction extends TransactionHistory {
  type: string;
}

export function TransactionTracker({ address }: TransactionTrackerProps) {
  const [searchAddress, setSearchAddress] = useState('');
  const [layer1Balance, setLayer1Balance] = useState<string>("0");
  const [layer2Balance, setLayer2Balance] = useState<string>("0");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const fetchBalances = async (address: string) => {
    try {
      const [l1Balance, l2Balance] = await Promise.all([
        getLayer1Balance(address),
        getLayer2Balance(address)
      ]);

      // Format the balances with proper decimal places and handle NaN
      const formatBalance = (balance: string) => {
        const num = Number(balance);
        return isNaN(num) ? "0.000000" : num.toFixed(6);
      };

      setLayer1Balance(formatBalance(l1Balance));
      setLayer2Balance(formatBalance(l2Balance));
    } catch (error) {
      console.error("Error fetching balances:", error);
      setError('Failed to fetch balances');
      setLayer1Balance("0.000000");
      setLayer2Balance("0.000000");
    }
  };

  const fetchTransactions = async (address: string) => {
    if (!address) return;

    try {
      setLoading(true);
      const txHistory = await getTransactionHistory(address);
      setTransactions(txHistory.map(tx => ({ ...tx, type: tx.type || 'transfer' })));
      await fetchBalances(address);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch transaction history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchAddress) {
      setError('Please enter an address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await Promise.all([
        fetchBalances(searchAddress),
        fetchTransactions(searchAddress)
      ]);
    } catch (err) {
      console.error('Error during search:', err);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'completed':
      case 'confirmed':
        return <Badge variant="default">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
  };

  const getTransactionType = (type: string) => {
    switch (type.toLowerCase()) {
      case 'deposit':
        return 'Layer 1 → Layer 2';
      case 'withdraw':
        return 'Layer 2 → Layer 1';
      case 'transfer':
        return 'Layer 2 Transfer';
      default:
        return type;
    }
  };

  if (!address) {
    return (
      <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
        <CardContent className="py-8">
          <div className="text-center text-white/70">
            Enter a wallet address to view transaction history
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
      <CardHeader>
        <CardTitle className="text-2xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
          Account Details
        </CardTitle>
        <CardDescription className="text-white/70">
          View account balances and transaction history
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Transaction Tracker</h2>

          <div className="flex gap-4">
            <Input
              placeholder="Enter address"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {error && (
            <div className="text-red-500">{error}</div>
          )}

          {searchAddress && (
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-black/20 border border-white/10">
                <h3 className="text-lg font-medium text-white mb-2">Layer 1 Balance</h3>
                <p className="text-2xl font-bold text-white">
                  {Number(layer1Balance).toFixed(6)} ETH
                </p>
              </Card>
              <Card className="p-4 bg-black/20 border border-white/10">
                <h3 className="text-lg font-medium text-white mb-2">Layer 2 Balance</h3>
                <p className="text-2xl font-bold text-white">
                  {Number(layer2Balance).toFixed(6)} ETH
                </p>
              </Card>
            </div>
          )}

          {transactions.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-white/70">Type</TableHead>
                  <TableHead className="text-white/70">From</TableHead>
                  <TableHead className="text-white/70">To</TableHead>
                  <TableHead className="text-white/70">Amount (ETH)</TableHead>
                  <TableHead className="text-white/70">Status</TableHead>
                  <TableHead className="text-white/70">Batch ID</TableHead>
                  <TableHead className="text-white/70">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.hash}>
                    <TableCell className="text-white/70">{getTransactionType(tx.type)}</TableCell>
                    <TableCell className="text-white/70 font-mono text-sm">
                      {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                    </TableCell>
                    <TableCell className="text-white/70 font-mono text-sm">
                      {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                    </TableCell>
                    <TableCell className="text-white/70">{formatEther(tx.value)}</TableCell>
                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    <TableCell>{tx.batchId || '-'}</TableCell>
                    <TableCell className="text-white/70">{formatTimestamp(tx.timestamp)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {searchAddress && transactions.length === 0 && !loading && (
            <div className="text-center py-4">
              No transactions found for this address
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
