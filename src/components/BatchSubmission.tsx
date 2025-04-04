import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { batchTransfer, executeL2Transaction, getLayer2Balance } from "@/lib/ethers";
import { useWallet } from "@/hooks/useWallet";
import { createMerkleTreeFromTransactions, hashTransaction, Transaction } from "@/lib/merkleTree";

interface BatchSubmissionProps {
  onSuccess?: () => void;
}

interface BatchTransaction {
  recipient: string;
  amount: string;
}

const BatchSubmission = ({ onSuccess }: BatchSubmissionProps) => {
  const { address, isConnected } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [transactions, setTransactions] = useState<BatchTransaction[]>([]);
  const [layer2Balance, setLayer2Balance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchBalance = async () => {
      if (address) {
        const balance = await getLayer2Balance(address);
        setLayer2Balance(balance);
      }
    };
    fetchBalance();
  }, [address]);

  const handleAddTransaction = () => {
    if (!recipient || !amount) {
      toast({
        title: "Invalid Input",
        description: "Please enter both recipient and amount",
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

  const handleSubmit = async () => {
    if (!recipient || !amount) {
      toast({
        title: "Invalid Input",
        description: "Please enter both recipient address and amount",
        variant: "destructive",
      });
      return;
    }

    // Check if amount is valid
    try {
      const amountInEth = parseFloat(amount);
      if (isNaN(amountInEth) || amountInEth <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid positive amount",
          variant: "destructive",
        });
        return;
      }

      if (amountInEth > parseFloat(layer2Balance)) {
        toast({
          title: "Insufficient Balance",
          description: `Amount (${amount} ETH) exceeds your Layer 2 balance (${layer2Balance} ETH)`,
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await executeL2Transaction(recipient, amount);
      toast({
        title: "Transaction Submitted",
        description: "Your Layer 2 transfer has been submitted successfully",
      });

      setRecipient("");
      setAmount("");
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Transaction error:", error);
      let errorMessage = "Failed to submit transaction";

      if (error instanceof Error) {
        if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient Layer 2 balance for this transfer";
        } else if (error.message.includes("user rejected")) {
          errorMessage = "Transaction was rejected by user";
        } else if (error.message.includes("gas required exceeds")) {
          errorMessage = "Transaction would exceed gas limits. Try a smaller amount.";
        }
      }

      toast({
        title: "Transaction Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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

    setIsLoading(true);
    try {
      // Convert batch transactions to the format expected by the Merkle tree
      const l2Transactions: Transaction[] = transactions.map(tx => ({
        sender: address!,
        recipient: tx.recipient,
        amount: tx.amount
      }));

      // Create a Merkle tree from the transactions
      const merkleTree = createMerkleTreeFromTransactions(l2Transactions);
      const merkleRoot = merkleTree.getRoot();

      // Get the recipients and amounts for the batch transfer
      const recipients = transactions.map(tx => tx.recipient);
      const amounts = transactions.map(tx => tx.amount);

      // Submit the batch with the Merkle root
      await batchTransfer(recipients, amounts);

      toast({
        title: "Batch Submitted",
        description: "Your Layer 2 batch transfer has been submitted successfully",
      });

      setTransactions([]);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Batch error:", error);
      let errorMessage = "Failed to submit batch";

      if (error instanceof Error) {
        if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient Layer 2 balance for this batch transfer";
        } else if (error.message.includes("user rejected")) {
          errorMessage = "Batch was rejected by user";
        }
      }

      toast({
        title: "Batch Failed",
        description: errorMessage,
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
          Layer 2 Batch Submission
        </CardTitle>
        <CardDescription className="text-white/70">
          Submit Layer 2 transactions to be included in the next batch
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Your Layer 2 Balance: {layer2Balance} ETH</h3>
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
              onClick={handleAddTransaction}
              disabled={isLoading || !recipient || !amount}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all duration-200"
            >
              Add to Batch
            </Button>
          </div>

          {transactions.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Current Batch</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Amount (ETH)</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-white/70">{tx.recipient.slice(0, 6)}...{tx.recipient.slice(-4)}</TableCell>
                      <TableCell className="text-white/70">{tx.amount}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveTransaction(index)}
                          disabled={isLoading}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button
                onClick={handleSubmitBatch}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all duration-200"
              >
                {isLoading ? "Submitting Batch..." : "Submit Batch"}
              </Button>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Single Transaction</h3>
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
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchSubmission;
