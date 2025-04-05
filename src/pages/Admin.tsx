import { useEffect, useState } from "react";
import AdminBatchManager from "@/components/AdminBatchManager";
import OperatorManager from "@/components/OperatorManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isAdmin, isOperator } from "@/lib/ethers";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function Admin() {
  const { address, isConnected } = useWallet();
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [isUserOperator, setIsUserOperator] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkAccess = async () => {
      if (!address) {
        setLoading(false);
        return;
      }

      try {
        const [adminStatus, operatorStatus] = await Promise.all([
          isAdmin(address),
          isOperator(address)
        ]);

        setIsUserAdmin(adminStatus);
        setIsUserOperator(operatorStatus);
      } catch (error) {
        console.error("Error checking admin/operator status:", error);
        toast({
          title: "Error",
          description: "Failed to verify admin/operator status",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [address, toast]);

  if (!isConnected) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          Please connect your wallet to access the admin panel.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!isUserAdmin && !isUserOperator) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You need admin or operator privileges to access this page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-primary">Admin Panel</h1>

      {/* Only show Operator Management to admins */}
      {isUserAdmin && (
        <div className="mb-6">
          <OperatorManager />
        </div>
      )}

      {/* Show Batch Management to both admins and operators */}
      <div>
        <AdminBatchManager isAdmin={isUserAdmin} />
      </div>
    </div>
  );
}
