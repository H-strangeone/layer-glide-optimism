import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { addOperator, removeOperator, isOperator, getContract, isAdmin } from "@/lib/ethers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/hooks/useWallet";

interface Operator {
    address: string;
    isActive: boolean;
}

export default function OperatorManager() {
    const [operators, setOperators] = useState<Operator[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [operatorAddress, setOperatorAddress] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isUserAdmin, setIsUserAdmin] = useState(false);
    const { toast } = useToast();
    const { address } = useWallet();

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (address) {
                const adminStatus = await isAdmin(address);
                setIsUserAdmin(adminStatus);
            }
        };
        checkAdminStatus();
    }, [address]);

    const fetchOperators = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('http://localhost:5500/api/operators');
            if (!response.ok) {
                throw new Error('Failed to fetch operators from database');
            }
            const dbOperators = await response.json();

            try {
                const contract = await getContract();
                const enrichedOperators = await Promise.all(dbOperators.map(async (operator: Operator) => {
                    try {
                        const isOperator = await contract.isOperator(operator.address);
                        return {
                            ...operator,
                            isActive: isOperator
                        };
                    } catch (err) {
                        console.warn(`Failed to verify operator status for ${operator.address}:`, err);
                        return operator;
                    }
                }));

                setOperators(enrichedOperators);
            } catch (err) {
                console.warn('Failed to get on-chain data:', err);
                setOperators(dbOperators);
            }
        } catch (err) {
            console.error('Error fetching operators:', err);
            setError('Failed to fetch operators');
            setOperators([]);
            toast({
                title: "Error",
                description: "Failed to fetch operators. Please try again later.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOperators();
        const interval = setInterval(fetchOperators, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleAddOperator = async () => {
        if (!operatorAddress) {
            toast({
                title: "Error",
                description: "Please enter an operator address",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            await addOperator(operatorAddress);
            toast({
                title: "Success",
                description: "Operator added successfully",
            });
            setOperatorAddress("");
            fetchOperators();
        } catch (error: any) {
            console.error("Error adding operator:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to add operator",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveOperator = async () => {
        if (!operatorAddress) {
            toast({
                title: "Error",
                description: "Please enter an operator address",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            await removeOperator(operatorAddress);
            toast({
                title: "Success",
                description: "Operator removed successfully",
            });
            setOperatorAddress("");
            fetchOperators();
        } catch (error: any) {
            console.error("Error removing operator:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to remove operator",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="glass-card border border-white/10 backdrop-blur-md bg-black/30">
            <CardHeader>
                <CardTitle className="text-2xl bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                    Operator Management
                </CardTitle>
                <CardDescription className="text-white/70">
                    View and manage network operators
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isUserAdmin && (
                    <div className="flex gap-4 mb-6">
                        <Input
                            placeholder="Enter operator address (0x...)"
                            value={operatorAddress}
                            onChange={(e) => setOperatorAddress(e.target.value)}
                            className="bg-white/5 border-white/10 text-white flex-1"
                        />
                        <Button
                            onClick={handleAddOperator}
                            disabled={isLoading}
                            className="bg-purple-500 hover:bg-purple-600"
                        >
                            Add Operator
                        </Button>
                        <Button
                            onClick={handleRemoveOperator}
                            disabled={isLoading}
                            variant="destructive"
                        >
                            Remove Operator
                        </Button>
                    </div>
                )}
                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                        <p className="mt-2 text-white/70">Loading operators...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-8 text-red-400">
                        {error}
                    </div>
                ) : operators.length === 0 ? (
                    <div className="text-center py-8 text-white/70">
                        No operators found
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Address</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {operators.map((operator) => (
                                    <TableRow key={operator.address}>
                                        <TableCell className="font-mono">
                                            {operator.address.substring(0, 6)}...{operator.address.substring(operator.address.length - 4)}
                                        </TableCell>
                                        <TableCell>
                                            {operator.isActive ? (
                                                <Badge variant="default">Active</Badge>
                                            ) : (
                                                <Badge variant="secondary">Inactive</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 