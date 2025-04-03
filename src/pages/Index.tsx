import { useAccount } from "wagmi";
import { useState } from "react";
import DepositCard from "@/components/DepositCard";
import { NetworkStatus } from "@/components/NetworkStatus";
import TransactionTracker from "@/components/TransactionTracker";
import BatchSubmission from "@/components/BatchSubmission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Index() {
  const { address } = useAccount();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSuccess = () => {
    // Trigger a refresh of all components
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <NetworkStatus />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DepositCard onSuccess={handleSuccess} />
            <BatchSubmission onSuccess={handleSuccess} />
          </div>
          {address && (
            <TransactionTracker
              address={address}
              key={refreshTrigger} // Force refresh when transactions occur
            />
          )}
        </div>

        {/* Right Column - Network Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Layer 2 Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">How It Works</h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    <li>• Deposit ETH to Layer 2</li>
                    <li>• Submit transactions in batches</li>
                    <li>• Save on gas fees</li>
                    <li>• Withdraw anytime</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium">Features</h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    <li>• Fast transactions</li>
                    <li>• Lower costs</li>
                    <li>• Secure rollups</li>
                    <li>• Real-time status</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
