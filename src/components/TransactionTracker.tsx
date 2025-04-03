import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { getTransactionHistory, getGasPrice, TransactionStatus, TransactionHistory, TransactionEvent, TransactionReceipt } from '@/lib/ethers';
import { formatEther } from 'ethers';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getTransactionStatus, subscribeToTransactionEvents } from "@/lib/ethers";

interface TransactionTrackerProps {
  address: string;
}

export default function TransactionTracker({ address }: TransactionTrackerProps) {
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const [gasPrice, setGasPrice] = useState<string>('0');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const fetchData = async () => {
    if (!address) return;

    try {
      setLoading(true);
      const txHistory = await getTransactionHistory(address);
      setTransactions(txHistory);
    } catch (error) {
      console.error("Error fetching transaction data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address) {
      fetchData();
      // Refresh every 10 seconds
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [address]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const loadTransactions = async () => {
      if (!address) return;

      setLoading(true);
      try {
        // Subscribe to transaction events
        unsubscribe = await subscribeToTransactionEvents(async (event: TransactionEvent) => {
          if (event.eventName === "TransactionSubmitted") {
            const tx = event.args;
            const receipt = await getTransactionStatus(tx.transactionHash);

            setTransactions(prev => {
              const existingTx = prev.find(t => t.hash === tx.transactionHash);
              if (existingTx) {
                return prev.map(t =>
                  t.hash === tx.transactionHash
                    ? { ...t, status: receipt.status, gasPrice: receipt.effectiveGasPrice ? formatEther(receipt.effectiveGasPrice) : t.gasPrice }
                    : t
                );
              }

              return [{
                hash: tx.transactionHash,
                from: tx.from,
                to: tx.to,
                value: formatEther(tx.value),
                status: receipt.status,
                gasPrice: receipt.effectiveGasPrice ? formatEther(receipt.effectiveGasPrice) : '0',
                timestamp: Date.now()
              }, ...prev];
            });
          }
        });

        // Load initial transactions from localStorage
        const savedTransactions = localStorage.getItem(`transactions_${address}`);
        if (savedTransactions) {
          const parsedTransactions = JSON.parse(savedTransactions);
          setTransactions(parsedTransactions);

          // Update status for all transactions
          for (const tx of parsedTransactions) {
            const receipt = await getTransactionStatus(tx.hash);
            setTransactions(prev =>
              prev.map(t =>
                t.hash === tx.hash
                  ? { ...t, status: receipt.status, gasPrice: receipt.effectiveGasPrice ? formatEther(receipt.effectiveGasPrice) : t.gasPrice }
                  : t
              )
            );
          }
        }
      } catch (error) {
        console.error("Failed to load transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();

    // Save transactions to localStorage when they change
    const saveInterval = setInterval(() => {
      if (address) {
        localStorage.setItem(`transactions_${address}`, JSON.stringify(transactions));
      }
    }, 30000); // Save every 30 seconds

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(saveInterval);
    };
  }, [address]);

  const filteredTransactions = transactions.filter((tx) => {
    if (activeTab === "all") return true;
    return tx.status === activeTab;
  });

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-500';
      case 'pending':
        return 'text-yellow-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center py-4">Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p className="text-center py-4">No transactions found</p>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx.hash}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Transaction Hash</p>
                    <p className="text-xs text-blue-500 truncate">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {formatAddress(tx.hash)}
                      </a>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className={`text-xs ${getStatusColor(tx.status)}`}>
                      {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">From</p>
                    <p className="text-xs text-gray-500 truncate">{formatAddress(tx.from)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">To</p>
                    <p className="text-xs text-gray-500 truncate">{formatAddress(tx.to)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Amount</p>
                    <p className="text-xs text-gray-500">
                      {formatEther(tx.value)} ETH
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Gas Price</p>
                    <p className="text-xs text-gray-500">
                      {formatEther(tx.gasPrice)} ETH
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
