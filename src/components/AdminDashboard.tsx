import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from './ui/use-toast';
import { useWallet } from '../hooks/useWallet';

interface Operator {
    id: string;
    address: string;
    isActive: boolean;
}

interface Contract {
    id: string;
    address: string;
    network: string;
    isActive: boolean;
}

const AdminDashboard: React.FC = () => {
    const { address } = useWallet();
    const { toast } = useToast();
    const [isAdmin, setIsAdmin] = useState(false);
    const [operators, setOperators] = useState<Operator[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [newOperatorAddress, setNewOperatorAddress] = useState('');
    const [newContractAddress, setNewContractAddress] = useState('');
    const [newContractNetwork, setNewContractNetwork] = useState('');

    useEffect(() => {
        checkAdminStatus();
        fetchOperators();
        fetchContracts();
    }, [address]);

    const checkAdminStatus = async () => {
        if (!address) return;

        try {
            const response = await fetch(`http://localhost:5500/api/admin/check?address=${address}`);
            const data = await response.json();
            setIsAdmin(data.isAdmin);
        } catch (error) {
            console.error('Error checking admin status:', error);
        }
    };

    const fetchOperators = async () => {
        try {
            const response = await fetch('http://localhost:5500/api/admin/operators');
            const data = await response.json();
            setOperators(data);
        } catch (error) {
            console.error('Error fetching operators:', error);
        }
    };

    const fetchContracts = async () => {
        try {
            const response = await fetch('http://localhost:5500/api/admin/contracts');
            const data = await response.json();
            setContracts(data);
        } catch (error) {
            console.error('Error fetching contracts:', error);
        }
    };

    const addOperator = async () => {
        if (!newOperatorAddress) {
            toast({
                title: 'Error',
                description: 'Operator address is required',
                variant: 'destructive',
            });
            return;
        }

        try {
            const response = await fetch('http://localhost:5500/api/admin/operators', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ address: newOperatorAddress }),
            });

            if (!response.ok) {
                throw new Error('Failed to add operator');
            }

            toast({
                title: 'Success',
                description: 'Operator added successfully',
            });

            setNewOperatorAddress('');
            fetchOperators();
        } catch (error) {
            console.error('Error adding operator:', error);
            toast({
                title: 'Error',
                description: 'Failed to add operator',
                variant: 'destructive',
            });
        }
    };

    const removeOperator = async (operatorAddress: string) => {
        try {
            const response = await fetch(`http://localhost:5500/api/admin/operators/${operatorAddress}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to remove operator');
            }

            toast({
                title: 'Success',
                description: 'Operator removed successfully',
            });

            fetchOperators();
        } catch (error) {
            console.error('Error removing operator:', error);
            toast({
                title: 'Error',
                description: 'Failed to remove operator',
                variant: 'destructive',
            });
        }
    };

    const addContract = async () => {
        if (!newContractAddress || !newContractNetwork) {
            toast({
                title: 'Error',
                description: 'Contract address and network are required',
                variant: 'destructive',
            });
            return;
        }

        try {
            const response = await fetch('http://localhost:5500/api/admin/contracts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    address: newContractAddress,
                    network: newContractNetwork,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to add contract');
            }

            toast({
                title: 'Success',
                description: 'Contract added successfully',
            });

            setNewContractAddress('');
            setNewContractNetwork('');
            fetchContracts();
        } catch (error) {
            console.error('Error adding contract:', error);
            toast({
                title: 'Error',
                description: 'Failed to add contract',
                variant: 'destructive',
            });
        }
    };

    if (!isAdmin) {
        return (
            <div className="container mx-auto p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Admin Dashboard</CardTitle>
                        <CardDescription>You do not have admin privileges</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Admin Dashboard</CardTitle>
                    <CardDescription>Manage operators and contracts</CardDescription>
                </CardHeader>
            </Card>

            <Tabs defaultValue="operators">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="operators">Operators</TabsTrigger>
                    <TabsTrigger value="contracts">Contracts</TabsTrigger>
                </TabsList>

                <TabsContent value="operators">
                    <Card>
                        <CardHeader>
                            <CardTitle>Manage Operators</CardTitle>
                            <CardDescription>Add or remove operators from the system</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4">
                                <div className="flex items-center gap-2">
                                    <Input
                                        placeholder="Operator address"
                                        value={newOperatorAddress}
                                        onChange={(e) => setNewOperatorAddress(e.target.value)}
                                    />
                                    <Button onClick={addOperator}>Add Operator</Button>
                                </div>

                                <div className="border rounded-md p-4">
                                    <h3 className="text-lg font-medium mb-2">Current Operators</h3>
                                    {operators.length === 0 ? (
                                        <p>No operators found</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {operators.map((operator) => (
                                                <div key={operator.id} className="flex items-center justify-between p-2 border rounded">
                                                    <span>{operator.address}</span>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => removeOperator(operator.address)}
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="contracts">
                    <Card>
                        <CardHeader>
                            <CardTitle>Manage Contracts</CardTitle>
                            <CardDescription>Register contracts deployed on different networks</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Input
                                        placeholder="Contract address"
                                        value={newContractAddress}
                                        onChange={(e) => setNewContractAddress(e.target.value)}
                                    />
                                    <Input
                                        placeholder="Network (e.g., mainnet, testnet)"
                                        value={newContractNetwork}
                                        onChange={(e) => setNewContractNetwork(e.target.value)}
                                    />
                                    <Button onClick={addContract}>Add Contract</Button>
                                </div>

                                <div className="border rounded-md p-4">
                                    <h3 className="text-lg font-medium mb-2">Registered Contracts</h3>
                                    {contracts.length === 0 ? (
                                        <p>No contracts registered</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {contracts.map((contract) => (
                                                <div key={contract.id} className="flex items-center justify-between p-2 border rounded">
                                                    <div>
                                                        <div className="font-medium">{contract.address}</div>
                                                        <div className="text-sm text-gray-500">{contract.network}</div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded text-xs ${contract.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                            {contract.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminDashboard; 