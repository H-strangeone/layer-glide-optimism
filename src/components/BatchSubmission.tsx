import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { batchTransfer, submitBatch } from "@/lib/ethers";
import { submitTransactions } from "@/lib/api";
import { useEffect, useState } from "react";
import { createMerkleTreeFromTransactions, Transaction } from "@/lib/merkleTree";
import { useWallet } from "@/hooks/useWallet";
import { getLayer2Balance, getContract } from "@/lib/ethers";
import { MerkleTree } from "@/lib/merkleTree";
import { toast } from "@/components/ui/use-toast";
import { ethers } from "ethers";

interface BatchSubmissionProps {
  onSuccess?: () => void;
}

interface BatchTransaction {
  recipient: string;
  amount: string;
}

interface PendingTransaction {
  id: number;
  sender: string;
  recipient: string;
  amount: string;
  status: 'pending' | 'submitted' | 'confirmed';
  timestamp: string;
}

const BatchSubmission = ({ onSuccess }: BatchSubmissionProps) => {
  const { address, isConnected } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [transactions, setTransactions] = useState<BatchTransaction[]>([]);
  const [layer2Balance, setLayer2Balance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [nextBatchId, setNextBatchId] = useState<number>(0);

  useEffect(() => {
    const fetchBalance = async () => {
      if (address) {
        const balance = await getLayer2Balance(address);
        setLayer2Balance(balance);
      }
    };
    fetchBalance();
  }, [address]);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!isConnected || !address) return;

      try {
        const contract = await getContract();
        const adminAddress = await contract.admin();
        setIsAdmin(adminAddress.toLowerCase() === address.toLowerCase());
      } catch (error) {
        console.error('Error checking admin:', error);
        toast({
          title: "Admin Check Failed",
          description: "Could not verify admin status",
          variant: "destructive",
        });
      }
    };

    const fetchPendingTransactions = async () => {
      if (!isAdmin) return;

      try {
        const response = await fetch('http://localhost:5500/api/transactions/pending');

        // Clone the response for error logging if needed
        const responseClone = response.clone();

        if (!response.ok) {
          const errorText = await responseClone.text();
          console.error('API Error:', errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          console.error('Unexpected response format:', data);
          throw new TypeError("Expected array of transactions");
        }

        setPendingTransactions(data);

        // Get next batch ID
        const contract = await getContract();
        const batchId = await contract.nextBatchId();
        setNextBatchId(Number(batchId));
      } catch (error) {
        console.error('Error fetching pending transactions:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to fetch pending transactions",
          variant: "destructive",
        });
      }
    };

    checkAdmin();
    if (isAdmin) {
      fetchPendingTransactions();
      const interval = setInterval(fetchPendingTransactions, 10000);
      return () => clearInterval(interval);
    }
  }, [address, isConnected, isAdmin]);

  const handleAddTransaction = () => {
    if (!recipient || !amount) {
      toast({
        title: "Invalid Input",
        description: "Please enter both recipient and amount",
        variant: "destructive",
      });
      return;
    }

    if (!ethers.isAddress(recipient)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Ethereum address",
        variant: "destructive",
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    const totalAmount = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0) + amountNum;
    if (totalAmount > parseFloat(layer2Balance)) {
      toast({
        title: "Insufficient Balance",
        description: `Total batch amount (${totalAmount} ETH) exceeds your Layer 2 balance (${layer2Balance} ETH)`,
        variant: "destructive",
      });
      return;
    }

    setTransactions([...transactions, { recipient, amount }]);
    setRecipient("");
    setAmount("");
  };

  const handleRemoveTransaction = (index: number) => {
    setTransactions(transactions.filter((_, i) => i !== index));
  };

  const handleSubmitBatch = async () => {
    if (!isAdmin || pendingTransactions.length === 0) {
      toast({
        title: "Cannot Submit Batch",
        description: isAdmin ? "No pending transactions to submit" : "Only admin can submit batches",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const contract = await getContract();

      // Create transaction roots
      const transactionRoots = pendingTransactions.map(tx =>
        ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "address", "uint256"],
            [tx.sender, tx.recipient, ethers.parseEther(tx.amount)]
          )
        )
      );

      const tx = await contract.submitBatch(transactionRoots);
      await tx.wait();

      toast({
        title: "Batch Submitted",
        description: `Successfully submitted batch #${nextBatchId}`,
      });

      // Refresh pending transactions
      const response = await fetch('/api/transactions/pending');
      if (!response.ok) throw new Error('Failed to refresh transactions');
      const data = await response.json();
      setPendingTransactions(data);

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error submitting batch:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit batch",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!recipient || !amount) {
      toast({
        title: "Invalid Input",
        description: "Please enter both recipient address and amount",
        variant: "destructive",
      });
      return;
    }

    if (!ethers.isAddress(recipient)) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Ethereum address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await batchTransfer([recipient], [amount]);
      toast({
        title: "Transaction Submitted",
        description: "Your Layer 2 transaction has been submitted and will be included in the next batch",
      });

      setRecipient("");
      setAmount("");
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Transaction error:", error);
      toast({
        title: "Transaction Failed",
        description: error instanceof Error ? error.message : "Failed to submit transaction",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
        <CardContent className="py-8">
          <div className="text-center text-white/70">
            Please connect your wallet to use batch submission
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
      <CardHeader>
        <CardTitle className="text-2xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
          {isAdmin ? "Batch Submission" : "Submit Transaction"}
        </CardTitle>
        <CardDescription className="text-white/70">
          {isAdmin
            ? "Submit pending transactions as a batch"
            : "Submit a Layer 2 transaction to be included in the next batch"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {isAdmin ? (
            <>
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Pending Transactions</h3>
                {pendingTransactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Amount (ETH)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingTransactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-white/70">{tx.sender.slice(0, 6)}...{tx.sender.slice(-4)}</TableCell>
                          <TableCell className="text-white/70">{tx.recipient.slice(0, 6)}...{tx.recipient.slice(-4)}</TableCell>
                          <TableCell className="text-white/70">{tx.amount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-4 text-white/70">No pending transactions</div>
                )}
              </div>
              <Button
                onClick={handleSubmitBatch}
                disabled={isLoading || pendingTransactions.length === 0}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all duration-200"
              >
                {isLoading ? "Submitting Batch..." : "Submit Batch"}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-white/70">Recipient Address</label>
                <Input
                  placeholder="0x..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/70">Amount (ETH)</label>
                <Input
                  type="number"
                  placeholder="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="0.0001"
                  className="bg-white/5 border-white/10 text-white"
                  disabled={isLoading}
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !recipient || !amount}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all duration-200"
              >
                {isLoading ? "Submitting..." : "Submit Transaction"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default BatchSubmission;
