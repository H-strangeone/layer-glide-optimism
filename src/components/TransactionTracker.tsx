import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { getTransactionHistory, getGasPrice, TransactionStatus, TransactionHistory, TransactionEvent, TransactionReceipt } from '@/lib/ethers';
import { formatEther } from 'ethers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getTransactionStatus, subscribeToTransactionEvents } from "@/lib/ethers";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { createMerkleTreeFromTransactions } from "@/lib/merkle";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface TransactionTrackerProps {
  address?: string;
  onSuccess?: () => void;
}

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  status: string;
  gasPrice: string;
  timestamp: number;
  batchId?: string;
}

interface BatchDetails {
  id: string;
  transactions: Transaction[];
  merkleRoot: string;
  merkleProof?: string[];
}

export function TransactionTracker({ address, onSuccess }: TransactionTrackerProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [gasPrice, setGasPrice] = useState<string>('0');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedBatch, setSelectedBatch] = useState<BatchDetails | null>(null);
  const [showBatchDetails, setShowBatchDetails] = useState(false);
  const { toast } = useToast();

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
                    ? { ...t, status: receipt.status, gasPrice: receipt.effectiveGasPrice ? receipt.effectiveGasPrice.toString() : t.gasPrice }
                    : t
                );
              }

              return [{
                hash: tx.transactionHash,
                from: tx.from,
                to: tx.to,
                value: tx.value.toString(),
                status: receipt.status,
                gasPrice: receipt.effectiveGasPrice ? receipt.effectiveGasPrice.toString() : '0',
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
                  ? { ...t, status: receipt.status, gasPrice: receipt.effectiveGasPrice ? receipt.effectiveGasPrice.toString() : t.gasPrice }
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

  const handleViewBatchDetails = async (batchId: string) => {
    try {
      const batchTransactions = await getBatchTransactions(batchId);
      const merkleTree = createMerkleTreeFromTransactions(batchTransactions);
      const merkleRoot = merkleTree.getRoot();

      setSelectedBatch({
        id: batchId,
        transactions: batchTransactions,
        merkleRoot: merkleRoot,
        merkleProof: merkleTree.getProof(batchTransactions[0]) // Example proof for first transaction
      });
      setShowBatchDetails(true);
    } catch (error) {
      console.error("Error fetching batch details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch batch details",
        variant: "destructive",
      });
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>
          View your Layer 2 transaction history and batch details
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center py-4">Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p className="text-center py-4">No transactions found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hash</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Gas Price</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.hash}>
                  <TableCell className="font-mono">{tx.hash.slice(0, 8)}...</TableCell>
                  <TableCell className="font-mono">{tx.from.slice(0, 6)}...{tx.from.slice(-4)}</TableCell>
                  <TableCell className="font-mono">{tx.to.slice(0, 6)}...{tx.to.slice(-4)}</TableCell>
                  <TableCell>{formatEther(tx.value)} ETH</TableCell>
                  <TableCell>
                    <Badge variant={tx.status === "confirmed" ? "success" : "destructive"}>
                      {tx.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatEther(tx.gasPrice)} ETH</TableCell>
                  <TableCell>{formatTimestamp(tx.timestamp)}</TableCell>
                  <TableCell>
                    {tx.batchId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewBatchDetails(tx.batchId!)}
                      >
                        View Batch
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={showBatchDetails} onOpenChange={setShowBatchDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Batch Details</DialogTitle>
            <DialogDescription>
              View batch transactions and Merkle tree information
            </DialogDescription>
          </DialogHeader>
          {selectedBatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Batch ID</h3>
                  <p className="font-mono">{selectedBatch.id}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Merkle Root</h3>
                  <p className="font-mono">{selectedBatch.merkleRoot}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Merkle Proof (Example)</h3>
                <div className="bg-muted p-2 rounded-md">
                  <pre className="text-sm overflow-x-auto">
                    {JSON.stringify(selectedBatch.merkleProof, null, 2)}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Transactions</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedBatch.transactions.map((tx, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">{tx.from.slice(0, 6)}...{tx.from.slice(-4)}</TableCell>
                        <TableCell className="font-mono">{tx.to.slice(0, 6)}...{tx.to.slice(-4)}</TableCell>
                        <TableCell>{formatEther(tx.value)} ETH</TableCell>
                        <TableCell>
                          <Badge variant={tx.status === "confirmed" ? "success" : "destructive"}>
                            {tx.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
