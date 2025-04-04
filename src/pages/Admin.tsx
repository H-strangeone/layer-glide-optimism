import { useEffect, useState } from "react";
import AdminBatchManager from "@/components/AdminBatchManager";
import { OperatorManager } from "@/components/OperatorManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isAdmin } from "@/lib/ethers";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function Admin() {
  const { address, isConnected } = useWallet();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!address) {
        setIsAdminUser(false);
        setIsCheckingAdmin(false);
        return;
      }

      try {
        const adminStatus = await isAdmin(address);
        setIsAdminUser(adminStatus);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdminUser(false);
      } finally {
        setIsCheckingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [address]);

  if (!isConnected) {
    return (
      <div className="container mx-auto p-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Connected</AlertTitle>
          <AlertDescription>
            Please connect your wallet to access the admin dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isCheckingAdmin) {
    return (
      <div className="container mx-auto p-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Checking Access</AlertTitle>
          <AlertDescription>
            Verifying admin privileges...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isAdminUser) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have admin privileges. Please use an admin account.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
          <CardDescription>
            Manage batches and operators for the Layer 2 scaling solution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <OperatorManager />
            <AdminBatchManager />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
