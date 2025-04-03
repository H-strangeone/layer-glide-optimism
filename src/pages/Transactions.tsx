
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fetchBatches, getMockBatches } from "@/lib/api";
import { useEffect, useState } from "react";

const Transactions = () => {
  const [batches, setBatches] = useState([] as any[]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBatches = async () => {
      setIsLoading(true);
      try {
        // In a real implementation, this would fetch from the backend
        // const result = await fetchBatches();
        
        // Using mock data for demo
        const result = getMockBatches();
        setBatches(result);
      } catch (error) {
        console.error("Failed to load batches:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBatches();
  }, []);

  const getStatusBadge = (verified: boolean, finalized: boolean) => {
    if (finalized) {
      return <Badge variant="outline" className="border-green-500 text-green-500">Finalized</Badge>;
    } else if (verified) {
      return <Badge variant="outline" className="border-blue-500 text-blue-500">Verified</Badge>;
    } else {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-l2-bg">
      <div className="container mx-auto px-4 pb-12">
        <Navbar />
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-l2-primary to-l2-secondary bg-clip-text text-transparent">
            Transaction Batches
          </h1>
          <p className="text-lg text-white/70">
            View all transaction batches that have been submitted to the Layer 2 network
          </p>
        </div>
        
        <Card className="glass-card w-full">
          <CardHeader>
            <CardTitle className="text-2xl text-l2-secondary">Batch History</CardTitle>
            <CardDescription>
              All transaction batches are listed here with their current status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-white/60">Loading batches...</div>
            ) : batches.length === 0 ? (
              <div className="py-8 text-center text-white/60">No batches found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-white/70">Batch ID</TableHead>
                    <TableHead className="text-white/70">Transactions Root</TableHead>
                    <TableHead className="text-white/70">Timestamp</TableHead>
                    <TableHead className="text-white/70">Transactions</TableHead>
                    <TableHead className="text-white/70">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow key={batch.id} className="border-white/10">
                      <TableCell>{batch.id}</TableCell>
                      <TableCell className="font-mono">
                        {batch.transactionsRoot.slice(0, 10)}...
                      </TableCell>
                      <TableCell>{new Date(batch.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{batch.transactions.length}</TableCell>
                      <TableCell>{getStatusBadge(batch.verified, batch.finalized)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        
        <Card className="glass-card w-full mt-6">
          <CardHeader>
            <CardTitle className="text-xl text-white">Understanding Batch Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-white/70">
              <div>
                <h3 className="font-medium text-white mb-1">Batch States</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <span className="text-yellow-500">Pending</span>: The batch has been submitted but not yet verified
                  </li>
                  <li>
                    <span className="text-blue-500">Verified</span>: The batch has been verified but is still in the fraud proof window
                  </li>
                  <li>
                    <span className="text-green-500">Finalized</span>: The batch has been finalized and state updates are complete
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-white mb-1">Fraud Proof Window</h3>
                <p>
                  After a batch is submitted, there is a 7-day window during which anyone can submit
                  a fraud proof if they detect invalid state transitions. This ensures the security
                  of the Layer 2 network.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Transactions;
