import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { batchTransfer, executeL2Transaction, getLayer2Balance, submitBatchWithMerkleRoot } from "@/lib/ethers";
import { useWallet } from "@/hooks/useWallet";
import { createMerkleTreeFromTransactions, hashTransaction, Transaction } from "@/lib/merkleTree";

interface BatchSubmissionProps {
  onSuccess?: () => void;
}

interface BatchTransaction {
  recipient: string;
  amount: string;
}

const API_URL = "http://localhost:5500/api";

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

  const handleSubmitBatch = async () => {
    if (!address || transactions.length === 0) return;

    setIsLoading(true);
    try {
      // Create the batch transactions
      const batchTransactions = transactions.map((tx, index) => {
        if (!tx.recipient || !tx.amount) {
          throw new Error(`Transaction ${index + 1} is missing required fields`);
        }

        const amount = tx.amount.toString();
        if (isNaN(parseFloat(amount))) {
          throw new Error(`Transaction ${index + 1} has invalid amount: ${amount}`);
        }

        return {
          from: address,
          to: tx.recipient,
          amount: amount,
          status: 'pending',
          timestamp: Math.floor(Date.now() / 1000)
        };
      });

      console.log('Submitting transactions:', JSON.stringify(batchTransactions, null, 2));

      // Submit to backend API
      const response = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions: batchTransactions
        }),
      });

      const responseText = await response.text();
      console.log('API Response:', responseText);

      if (!response.ok) {
        throw new Error(`Failed to submit batch: ${responseText}`);
      }

      let result;
      try {
        result = JSON.parse(responseText);
        console.log('Parsed result:', result);
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error(`Invalid response format: ${responseText}`);
      }

      toast({
        title: "Success",
        description: `Batch #${result.batchId} submitted successfully`,
      });

      // Clear the transactions
      setTransactions([]);

      // Call onSuccess if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error submitting batch:", error);

      // Extract error message
      let errorMessage = "Failed to submit batch";
      if (error instanceof Error) {
        errorMessage = error.message;

        // Try to parse error details if it's a JSON string
        if (errorMessage.includes('{') && errorMessage.includes('}')) {
          try {
            const errorJson = JSON.parse(errorMessage.split('Failed to submit batch: ')[1]);
            if (errorJson.details) {
              errorMessage = `Error: ${errorJson.details}`;
            }
          } catch (e) {
            // If parsing fails, use the original error message
          }
        }
      }

      toast({
        title: "Error",
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
          <div>
            <h3 className="text-lg font-medium text-white mb-2">Your Layer 2 Balance: {layer2Balance} ETH</h3>
          </div>

          <div className="space-y-4">
            <Input
              placeholder="Recipient Address (0x...)"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
            <Input
              type="number"
              placeholder="Amount (ETH)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.000001"
              className="bg-white/5 border-white/10 text-white"
            />
            <Button
              onClick={handleAddTransaction}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              disabled={!recipient || !amount}
            >
              Add to Batch
            </Button>
          </div>

          {transactions.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-white">Pending Transactions</h4>
              <div className="space-y-2">
                {transactions.map((tx, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-2 rounded bg-white/5"
                  >
                    <div className="text-sm">
                      <div className="text-white/70">To: {tx.recipient.slice(0, 6)}...{tx.recipient.slice(-4)}</div>
                      <div className="text-white">{tx.amount} ETH</div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setTransactions(transactions.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleSubmitBatch}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {isLoading ? "Submitting..." : "Submit Batch"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchSubmission;
