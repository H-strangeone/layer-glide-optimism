import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { getTransactionHistory, getLayer2Balance, getLayer1Balance } from '@/lib/ethers';
import { formatDistanceToNow } from "date-fns";
import { formatEther } from "ethers";
import { useWallet } from "@/hooks/useWallet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define the TransactionHistory interface
interface TransactionHistory {
  hash: string;
  from: string;
  to: string;
  value: string;
  status: string;
  gasPrice?: string;
  timestamp: number;
  batchId?: string;
  type?: string;
  isInBatch?: boolean;
}

interface Transaction extends TransactionHistory {
  type: string;
  isInBatch: boolean;
}

interface Batch {
  id: string;
  status: string;
  transactions: Transaction[];
  timestamp: number;
  size: number;
}

interface TransactionTrackerProps {
  mode?: 'user' | 'network';
  address?: string;
}

export function TransactionTracker({ mode = 'user', address }: TransactionTrackerProps) {
  const { isConnected } = useWallet();
  const [layer1Balance, setLayer1Balance] = useState<string>("0");
  const [layer2Balance, setLayer2Balance] = useState<string>("0");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
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

  const fetchUserTransactions = async (address: string) => {
    if (!address) return;

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5500/api/transactions/user/${address}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user transactions');
      }
      const data = await response.json();
      setTransactions(data);
      await fetchBalances(address);
    } catch (error) {
      console.error("Error fetching user transactions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch transaction history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchNetworkData = async () => {
    try {
      setLoading(true);

      // Fetch all network transactions using the correct endpoint
      const response = await fetch('http://localhost:5500/api/transactions/network');
      if (!response.ok) {
        throw new Error('Failed to fetch network transactions');
      }
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching network data:", error);
      setError('Failed to fetch network data');
      toast({
        title: "Error",
        description: "Failed to fetch network transaction history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'user' && isConnected && address) {
      fetchUserTransactions(address);
    } else if (mode === 'network') {
      fetchNetworkData();

      // Set up polling to refresh data every 30 seconds
      const intervalId = setInterval(fetchNetworkData, 30000);

      return () => clearInterval(intervalId);
    }
  }, [isConnected, address, mode]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'completed':
      case 'confirmed':
      case 'verified':
        return <Badge variant="default">Completed</Badge>;
      case 'failed':
      case 'rejected':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
  };

  const getTransactionType = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'deposit':
        return 'Deposit';
      case 'withdrawal':
        return 'Withdrawal';
      case 'transfer':
      default:
        return 'Transfer';
    }
  };

  // Render user transaction history
  if (mode === 'user') {
    return (
      <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
        <CardHeader>
          <CardTitle className="text-xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Your Transaction History
          </CardTitle>
          <CardDescription className="text-white/70">
            {isConnected ? "View your recent Layer 2 transactions" : "Connect your wallet to view your transactions"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <div className="text-center py-8 text-white/70">
              Please connect your wallet to view your transaction history
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
              <p className="mt-2 text-white/70">Loading transactions...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-400">
              {error}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-white/70">
              No transactions found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx, index) => (
                    <TableRow key={index}>
                      <TableCell>{getTransactionType(tx.type)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {tx.from.substring(0, 6)}...{tx.from.substring(tx.from.length - 4)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {tx.to.substring(0, 6)}...{tx.to.substring(tx.to.length - 4)}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          try {
                            // Check if the value is a valid number string
                            if (tx.value && !isNaN(Number(tx.value))) {
                              // If it's a decimal string, just display it directly
                              if (tx.value.includes('.')) {
                                return `${tx.value} ETH`;
                              }
                              // Otherwise use formatEther
                              return `${formatEther(tx.value)} ETH`;
                            }
                            return '0 ETH';
                          } catch (error) {
                            console.error('Error formatting value:', error);
                            return '0 ETH';
                          }
                        })()}
                      </TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      <TableCell>{formatTimestamp(tx.timestamp)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Render network transaction history
  if (mode === 'network') {
    return (
      <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
        <CardHeader>
          <CardTitle className="text-xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            All Network Transactions
          </CardTitle>
          <CardDescription className="text-white/70">
            View all transactions and batches processed on the Layer 2 network
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
              <p className="mt-2 text-white/70">Loading transactions...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-400">
              {error}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-white/70">
              No transactions found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {tx.isInBatch ? (
                        <Badge variant="secondary">Batch</Badge>
                      ) : (
                        <Badge variant="outline">{getTransactionType(tx.type)}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {tx.from.substring(0, 6)}...{tx.from.substring(tx.from.length - 4)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {tx.to.substring(0, 6)}...{tx.to.substring(tx.to.length - 4)}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        try {
                          // Check if the value is a valid number string
                          if (tx.value && !isNaN(Number(tx.value))) {
                            // If it's a decimal string, just display it directly
                            if (tx.value.includes('.')) {
                              return `${tx.value} ETH`;
                            }
                            // Otherwise use formatEther
                            return `${formatEther(tx.value)} ETH`;
                          }
                          return '0 ETH';
                        } catch (error) {
                          console.error('Error formatting value:', error);
                          return '0 ETH';
                        }
                      })()}
                    </TableCell>
                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    <TableCell>{tx.batchId || '-'}</TableCell>
                    <TableCell>{formatTimestamp(tx.timestamp)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    );
  }
}
