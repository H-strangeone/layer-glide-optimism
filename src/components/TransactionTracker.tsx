
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { fetchTransactionStatus, getMockTransactionStatus, TransactionStatus } from "@/lib/api";
import { useEffect, useState } from "react";

interface TransactionTrackerProps {
  address?: string;
}

const TransactionTracker = ({ address }: TransactionTrackerProps) => {
  const [transactions, setTransactions] = useState<TransactionStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const loadTransactions = async () => {
      setIsLoading(true);
      try {
        if (address) {
          // In a real implementation, this would fetch from the backend
          // const result = await fetchTransactionStatus(address);
          
          // Using mock data for demo
          const result = getMockTransactionStatus(address);
          setTransactions(result);
        }
      } catch (error) {
        console.error("Failed to load transactions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTransactions();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadTransactions, 30000);
    
    return () => clearInterval(interval);
  }, [address]);

  const filteredTransactions = transactions.filter((tx) => {
    if (activeTab === "all") return true;
    return tx.status === activeTab;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Pending</Badge>;
      case "confirmed":
        return <Badge variant="outline" className="border-green-500 text-green-500">Confirmed</Badge>;
      case "failed":
        return <Badge variant="outline" className="border-red-500 text-red-500">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card className="glass-card w-full mt-6">
      <CardHeader>
        <CardTitle className="text-2xl text-l2-secondary">Transaction Status</CardTitle>
        <CardDescription>Track your L2 transactions and their current status</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-6 glass-card">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="py-8 text-center text-white/60">Loading transactions...</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-8 text-center text-white/60">No transactions found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-white/70">TX Hash</TableHead>
                    <TableHead className="text-white/70">Recipient</TableHead>
                    <TableHead className="text-white/70">Amount</TableHead>
                    <TableHead className="text-white/70">Timestamp</TableHead>
                    <TableHead className="text-white/70">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id} className="border-white/10">
                      <TableCell className="font-mono">
                        {tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                      </TableCell>
                      <TableCell>{tx.amount} ETH</TableCell>
                      <TableCell>{new Date(tx.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TransactionTracker;
