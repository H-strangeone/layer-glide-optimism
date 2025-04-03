
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

interface NetworkStatusProps {
  network?: string;
}

const NetworkStatus = ({ network = "Unknown" }: NetworkStatusProps) => {
  const [gasPrice, setGasPrice] = useState("0");
  const [blockHeight, setBlockHeight] = useState(0);
  const [batchCount, setBatchCount] = useState(0);
  const [pendingTransactions, setPendingTransactions] = useState(0);
  const [l2ProcessingTime, setL2ProcessingTime] = useState("~2 seconds");
  const [l1FinalityTime, setL1FinalityTime] = useState("~15 minutes");
  
  // Simulate fetching network stats
  useEffect(() => {
    // In a real implementation, fetch this data from backend/blockchain
    setGasPrice("25");
    setBlockHeight(4758291);
    setBatchCount(154);
    setPendingTransactions(12);
    
    // Simulating updates
    const interval = setInterval(() => {
      setBlockHeight(prev => prev + 1);
      setPendingTransactions(Math.floor(Math.random() * 20));
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Card className="glass-card w-full">
      <CardHeader>
        <CardTitle className="text-2xl bg-gradient-to-r from-l2-primary to-l2-secondary bg-clip-text text-transparent">
          Layer 2 Network Status
        </CardTitle>
        <CardDescription>
          Current status of the Optimistic Rollup network
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-white/70">Network</span>
                <span className="text-sm font-medium">{network}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-white/70">Gas Price</span>
                <span className="text-sm font-medium">{gasPrice} Gwei</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-white/70">Current Block</span>
                <span className="text-sm font-medium">{blockHeight.toLocaleString()}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-white/70">Batches Processed</span>
                <span className="text-sm font-medium">{batchCount}</span>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-white/70">Pending Transactions</span>
                <span className="text-sm font-medium">{pendingTransactions}</span>
              </div>
              <Progress value={pendingTransactions * 5} className="h-2 bg-white/10" />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-black/20 p-4 rounded-lg border border-white/5">
              <h4 className="text-sm font-medium mb-2">Processing Times</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-white/70">L2 Confirmation</span>
                  <span className="text-xs font-medium text-l2-primary">{l2ProcessingTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-white/70">L1 Finality</span>
                  <span className="text-xs font-medium text-l2-secondary">{l1FinalityTime}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-black/20 p-4 rounded-lg border border-white/5">
              <h4 className="text-sm font-medium mb-2">Optimistic Rollup</h4>
              <p className="text-xs text-white/70">
                Transactions are executed off-chain and then batched to Ethereum. 
                A 7-day challenge period allows for fraud proofs to ensure correctness.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NetworkStatus;
