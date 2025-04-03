
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { getBatches, verifyBatch, reportFraud } from "@/lib/ethers";
import { useEffect, useState } from "react";

interface BatchData {
  id: string;
  transactionsRoot: string;
  timestamp: string;
  verified: boolean;
  finalized: boolean;
}

const Admin = () => {
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const loadBatches = async () => {
    setIsLoading(true);
    try {
      const result = await getBatches();
      setBatches(result);
    } catch (error) {
      console.error("Failed to load batches:", error);
      toast({
        title: "Error",
        description: "Failed to load batch data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleVerifyBatch = async (batchId: string) => {
    try {
      setIsProcessing(true);
      await verifyBatch(parseInt(batchId));
      toast({
        title: "Batch Verified",
        description: `Successfully verified batch ${batchId}`,
      });
      // Refresh batch data
      loadBatches();
    } catch (error) {
      console.error("Verification error:", error);
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Failed to verify batch",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChallengeBatch = async (batchId: string) => {
    try {
      setIsProcessing(true);
      // This would fetch proof data from the backend in a real implementation
      // For demo, we use mock data
      const mockTransaction = {
        sender: "0x1234567890123456789012345678901234567890",
        recipient: "0x0987654321098765432109876543210987654321",
        amount: "0.1",
      };
      const mockFraudProof = "0x123456789abcdef";
      const mockMerkleProof = ["0xabcdef123456789"];

      await reportFraud(
        parseInt(batchId),
        mockFraudProof,
        mockTransaction,
        mockMerkleProof
      );
      
      toast({
        title: "Fraud Report Submitted",
        description: `Successfully reported fraud for batch ${batchId}`,
      });
      
      // Refresh batch data
      loadBatches();
    } catch (error) {
      console.error("Fraud report error:", error);
      toast({
        title: "Fraud Report Failed",
        description: error instanceof Error ? error.message : "Failed to report fraud",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

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
            Admin Dashboard
          </h1>
          <p className="text-lg text-white/70">
            Manage and monitor the Layer 2 system
          </p>
        </div>
        
        <Card className="glass-card w-full">
          <CardHeader>
            <CardTitle className="text-2xl text-l2-secondary">Batch Management</CardTitle>
            <CardDescription>
              Verify batches or challenge them if you find invalid state transitions
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
                    <TableHead className="text-white/70">Status</TableHead>
                    <TableHead className="text-white/70 text-right">Actions</TableHead>
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
                      <TableCell>{getStatusBadge(batch.verified, batch.finalized)}</TableCell>
                      <TableCell className="text-right">
                        {!batch.verified && !batch.finalized && (
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVerifyBatch(batch.id)}
                              disabled={isProcessing}
                              className="border-l2-primary text-l2-primary"
                            >
                              Verify
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleChallengeBatch(batch.id)}
                              disabled={isProcessing}
                              className="border-red-500 text-red-500"
                            >
                              Challenge
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card className="glass-card w-full">
            <CardHeader>
              <CardTitle className="text-xl text-white">Fraud Proof Mechanism</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-white/70">
                <p>
                  The Optimistic Rollup relies on fraud proofs to ensure the validity of state transitions. 
                  If invalid state transitions are detected, anyone can submit a fraud proof to challenge the batch.
                </p>
                
                <div className="space-y-1">
                  <h3 className="font-medium text-white">How Fraud Proofs Work:</h3>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>A batch of transactions is submitted to the Layer 2 contract.</li>
                    <li>The state transitions are computed off-chain.</li>
                    <li>The transaction data is made available for verification.</li>
                    <li>During the challenge period (7 days), anyone can submit a fraud proof.</li>
                    <li>If a fraud proof is valid, the batch is rejected.</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card w-full">
            <CardHeader>
              <CardTitle className="text-xl text-white">Merkle Tree Implementation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-white/70">
                <p>
                  Merkle trees are used to efficiently verify the inclusion of transactions in a batch. 
                  Each transaction is hashed and combined to form a Merkle root, which is stored on-chain.
                </p>
                
                <div className="space-y-1">
                  <h3 className="font-medium text-white">Benefits of Merkle Trees:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Efficient verification of transaction inclusion</li>
                    <li>Compact representation of large data sets</li>
                    <li>Easy generation of inclusion/exclusion proofs</li>
                    <li>Essential for scaling solutions with limited on-chain data</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;
