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
import { Link } from 'react-router-dom';

// Helper function to format addresses
const formatAddress = (address: string) => {
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Define the Transaction interface
interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  status: string;
  createdAt: number;
  batchId?: string;
  type?: string;
  isInBatch?: boolean;
}

interface TransactionTrackerProps {
  mode?: 'user' | 'network';
  address?: string;
}

export function TransactionTracker({ mode = 'user', address }: TransactionTrackerProps) {
  const { isConnected } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUserTransactions = async (address: string) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5500/api/transactions/user/${address}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user transactions');
      }
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching user transactions:", error);
      setError('Failed to fetch user transactions');
      toast({
        title: "Error",
        description: "Failed to fetch user transaction history",
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
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="p-4 text-gray-500">
        <p>No transactions found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Batch</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.hash}>
              <TableCell>{getTransactionType(tx.type || 'transfer')}</TableCell>
              <TableCell className="font-mono">{formatAddress(tx.from)}</TableCell>
              <TableCell className="font-mono">{formatAddress(tx.to)}</TableCell>
              <TableCell>{formatEther(tx.value)} ETH</TableCell>
              <TableCell>{getStatusBadge(tx.status)}</TableCell>
              <TableCell>{formatTimestamp(tx.createdAt)}</TableCell>
              <TableCell>
                {tx.batchId ? (
                  <Link to={`/batches/${tx.batchId}`} className="text-blue-500 hover:underline">
                    {tx.batchId}
                  </Link>
                ) : (
                  'Not in batch'
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
