import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { addOperator, removeOperator, isOperator, getContract } from "@/lib/ethers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function OperatorManager() {
    const [operatorAddress, setOperatorAddress] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [operators, setOperators] = useState<string[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        fetchOperators();
    }, []);

    const fetchOperators = async () => {
        try {
            const contract = await getContract();
            // Get the admin address
            const adminAddress = await contract.admin();

            // For demo purposes, we'll check a few known addresses
            // In a production environment, you'd want to track operator events
            const testAddresses = [
                adminAddress,
                "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
            ];

            const operatorStatuses = await Promise.all(
                testAddresses.map(async (address) => {
                    const isOp = await contract.isOperator(address);
                    return { address, isOperator: isOp };
                })
            );

            setOperators(operatorStatuses.filter(op => op.isOperator).map(op => op.address));
        } catch (error) {
            console.error("Error fetching operators:", error);
            toast({
                title: "Error",
                description: "Failed to fetch operators",
                variant: "destructive",
            });
        }
    };

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
            fetchOperators(); // Refresh the list
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
            fetchOperators(); // Refresh the list
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
        <Card>
            <CardHeader>
                <CardTitle>Operator Management</CardTitle>
                <CardDescription>
                    Add or remove operators who can submit and verify batches
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex space-x-2">
                        <Input
                            placeholder="Operator Address"
                            value={operatorAddress}
                            onChange={(e) => setOperatorAddress(e.target.value)}
                        />
                        <Button
                            onClick={handleAddOperator}
                            disabled={isLoading}
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

                    <div className="mt-4">
                        <h3 className="text-lg font-semibold mb-2">Current Operators</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Address</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {operators.map((address) => (
                                    <TableRow key={address}>
                                        <TableCell className="font-mono">{address}</TableCell>
                                        <TableCell>
                                            <Badge variant="success">Active</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
} 