import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { getTransactionHistory } from "@/lib/ethers";
import { formatDistanceToNow } from 'date-fns';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

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

export default function TransactionHistory() {
  const { address } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!address) return;

      setLoading(true);
      try {
        const history = await getTransactionHistory(address);
        setTransactions(history);
        setError(null);
      } catch (err) {
        console.error("Error fetching transaction history:", err);
        setError("Failed to load transaction history");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();

    // Set up polling to refresh transactions every 30 seconds
    const interval = setInterval(fetchTransactions, 30000);

    return () => clearInterval(interval);
  }, [address]);

  const displayedTransactions = showAll ? transactions : transactions.slice(0, 3);
  const hasMoreTransactions = transactions.length > 3;

  if (!address) {
    return (
      <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
        <CardContent className="py-8">
          <div className="text-center text-white/70">
            Please connect your wallet to view transaction history
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
      <CardHeader>
        <CardTitle className="text-2xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
          Transaction History
        </CardTitle>
        <CardDescription className="text-white/70">
          Your recent transactions on the network
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
          <div className="space-y-4">
            {displayedTransactions.map((tx, index) => (
              <div
                key={tx.hash || index}
                className="p-4 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${tx.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                        tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          tx.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                        }`}>
                        {tx.status}
                      </span>
                      {tx.batchId && (
                        <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400">
                          Batch #{tx.batchId}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-sm">
                      <div className="text-white/70">
                        {tx.from.toLowerCase() === address.toLowerCase() ? 'To' : 'From'}:
                        <span className="ml-1 text-white">
                          {tx.from.toLowerCase() === address.toLowerCase() ? tx.to : tx.from}
                        </span>
                      </div>
                      <div className="text-white/70">
                        Amount: <span className="text-white">{tx.value} ETH</span>
                      </div>
                      <div className="text-white/70 text-xs">
                        {formatDistanceToNow(new Date(tx.timestamp * 1000), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  {tx.hash && (
                    <a
                      href={`https://etherscan.io/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>
            ))}

            {hasMoreTransactions && (
              <div className="flex justify-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAll(!showAll)}
                  className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                >
                  {showAll ? (
                    <>
                      <ChevronUp className="mr-2 h-4 w-4" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-2 h-4 w-4" />
                      View All Transactions
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 