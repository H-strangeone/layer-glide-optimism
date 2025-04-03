import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { batchTransfer, submitBatch } from "@/lib/ethers";
import { submitTransactions } from "@/lib/api";
import { useEffect, useState } from "react";
import { createMerkleTreeFromTransactions, Transaction } from "@/lib/merkleTree";

interface BatchSubmissionProps {
  onSuccess?: () => void;
}

interface BatchTransaction {
  recipient: string;
  amount: string;
}

const BatchSubmission = ({ onSuccess }: BatchSubmissionProps) => {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [transactions, setTransactions] = useState<BatchTransaction[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gasEstimate, setGasEstimate] = useState("0.0001");
  const { toast } = useToast();

  // Update gas estimate based on number of transactions
  useEffect(() => {
    // This is a simplified calculation for demo purposes
    setGasEstimate((0.0001 * (transactions.length || 1)).toFixed(6));
  }, [transactions]);

  const handleAddTransaction = () => {
    if (!recipient || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid recipient address and amount",
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
    if (transactions.length === 0) {
      toast({
        title: "No Transactions",
        description: "Please add at least one transaction to the batch",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert BatchTransactions to Merkle tree Transactions
      const merkleTransactions: Transaction[] = transactions.map(tx => ({
        sender: window.ethereum.selectedAddress,
        recipient: tx.recipient,
        amount: tx.amount
      }));

      // Create Merkle tree and get root
      const merkleTree = createMerkleTreeFromTransactions(merkleTransactions);
      const root = merkleTree.getRoot();

      // Submit batch with Merkle root
      await submitBatch([root]);

      toast({
        title: "Success",
        description: "Batch submitted successfully",
      });

      // Clear transactions after successful submission
      setTransactions([]);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error submitting batch:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit batch",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = transactions.reduce(
    (sum, tx) => sum + (isNaN(Number(tx.amount)) ? 0 : Number(tx.amount)),
    0
  );

  return (
    <Card className="glass-card w-full">
      <CardHeader>
        <CardTitle className="text-2xl text-l2-primary">Batch Transaction Submission</CardTitle>
        <CardDescription>Submit multiple transactions in a single batch to save gas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="text-sm text-white/70 mb-1 block">Recipient Address</label>
              <Input
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="bg-black/20 border-white/10"
              />
            </div>
            <div>
              <label className="text-sm text-white/70 mb-1 block">Amount (ETH)</label>
              <Input
                type="number"
                placeholder="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.0001"
                className="bg-black/20 border-white/10"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleAddTransaction}
              variant="outline"
              className="border-l2-primary text-l2-primary"
            >
              Add Transaction
            </Button>
          </div>

          {transactions.length > 0 && (
            <div className="animate-fade-in-up">
              <h3 className="text-lg font-medium mb-3">Transaction Preview</h3>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-white/70">#</TableHead>
                    <TableHead className="text-white/70">Recipient</TableHead>
                    <TableHead className="text-white/70">Amount (ETH)</TableHead>
                    <TableHead className="text-white/70 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx, index) => (
                    <TableRow key={index} className="border-white/10">
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-mono">
                        {tx.recipient.slice(0, 6)}...{tx.recipient.slice(-4)}
                      </TableCell>
                      <TableCell>{tx.amount} ETH</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTransaction(index)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex flex-col md:flex-row justify-between items-start md:items-center">
                <div className="text-sm space-y-1 mb-4 md:mb-0">
                  <p className="text-white/70">
                    Total Transactions: <span className="text-white">{transactions.length}</span>
                  </p>
                  <p className="text-white/70">
                    Total Amount: <span className="text-white">{totalAmount.toFixed(6)} ETH</span>
                  </p>
                  <p className="text-white/70">
                    Estimated Gas: <span className="text-white">{gasEstimate} ETH</span>
                  </p>
                </div>
                <Button
                  onClick={handleSubmitBatch}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-l2-primary to-l2-secondary text-white animate-pulse-glow"
                >
                  {isSubmitting ? "Submitting..." : "Submit Batch to L2"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchSubmission;
