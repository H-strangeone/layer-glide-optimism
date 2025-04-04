import AdminBatchManager from "@/components/AdminBatchManager";
import BatchSubmission from "@/components/BatchSubmission";
import { useEffect, useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { isAdmin } from "@/lib/ethers";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const Admin = () => {
  const { address, isConnected } = useWallet();
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!isConnected || !address) {
        setHasAdminAccess(false);
        setIsChecking(false);
        return;
      }

      try {
        const isUserAdmin = await isAdmin(address);
        setHasAdminAccess(isUserAdmin);
      } catch (error) {
        console.error('Error checking admin access:', error);
        setHasAdminAccess(false);
      }
      setIsChecking(false);
    };

    checkAdminAccess();
  }, [address, isConnected]);

  if (isChecking) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Checking Access...</CardTitle>
            <CardDescription>Please wait while we verify your admin privileges.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-red-500">Access Denied</CardTitle>
            <CardDescription>
              You do not have admin privileges to access this page.
              Please connect with an admin account.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8 py-8">
      <h1 className="text-4xl font-bold text-l2-primary">Admin Dashboard</h1>

      <div className="grid gap-8">
        <BatchSubmission />
        <AdminBatchManager />
      </div>
    </div>
  );
};

export default Admin;
