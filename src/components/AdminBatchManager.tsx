import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { getBatches, submitBatch, isAdmin, Batch } from '@/lib/ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export const AdminBatchManager: React.FC = () => {
    const { address } = useAccount();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasAdminAccess, setHasAdminAccess] = useState(false);

    useEffect(() => {
        const checkAdminAccess = async () => {
            if (!address) return;
            try {
                const isUserAdmin = await isAdmin(address);
                setHasAdminAccess(isUserAdmin);
                if (isUserAdmin) {
                    fetchBatches();
                } else {
                    toast({
                        title: "Access Denied",
                        description: "You don't have admin privileges to access this page.",
                        variant: "destructive",
                    });
                }
            } catch (error) {
                console.error('Error checking admin access:', error);
                toast({
                    title: "Error",
                    description: "Failed to check admin privileges.",
                    variant: "destructive",
                });
            }
        };

        checkAdminAccess();
    }, [address]);

    const fetchBatches = async () => {
        try {
            const fetchedBatches = await getBatches();
            setBatches(fetchedBatches);
        } catch (error) {
            console.error('Error fetching batches:', error);
            toast({
                title: "Error",
                description: "Failed to fetch batches.",
                variant: "destructive",
            });
        }
    };

    const handleSubmitBatch = async (batchId: number) => {
        if (!hasAdminAccess) return;

        setIsLoading(true);
        try {
            await submitBatch(batchId);
            toast({
                title: "Success",
                description: "Batch submitted successfully.",
            });
            fetchBatches();
        } catch (error) {
            console.error('Error submitting batch:', error);
            toast({
                title: "Error",
                description: "Failed to submit batch.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!hasAdminAccess) {
        return (
            <Card className="glass-card w-full">
                <CardHeader>
                    <CardTitle className="text-2xl bg-gradient-to-r from-l2-primary to-l2-secondary bg-clip-text text-transparent">
                        Admin Access Required
                    </CardTitle>
                    <CardDescription>
                        You need admin privileges to access this page.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="glass-card w-full">
            <CardHeader>
                <CardTitle className="text-2xl bg-gradient-to-r from-l2-primary to-l2-secondary bg-clip-text text-transparent">
                    Batch Management
                </CardTitle>
                <CardDescription>
                    Manage and submit transaction batches
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {batches.map((batch) => (
                        <div key={batch.id} className="bg-black/20 p-4 rounded-lg border border-white/5">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-medium">Batch #{batch.id}</h3>
                                    <p className="text-sm text-white/70">
                                        {batch.transactions.length} transactions
                                    </p>
                                </div>
                                <Button
                                    onClick={() => handleSubmitBatch(batch.id)}
                                    disabled={isLoading || batch.status === 'submitted'}
                                    className="bg-gradient-to-r from-l2-primary to-l2-secondary hover:opacity-90"
                                >
                                    {isLoading ? 'Submitting...' : 'Submit Batch'}
                                </Button>
                            </div>
                            <div className="mt-2 text-sm text-white/70">
                                Status: {batch.status}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default AdminBatchManager; 