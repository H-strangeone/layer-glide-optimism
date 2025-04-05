import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useToast } from './ui/use-toast';
import { useWallet } from '../hooks/useWallet';

const FraudProof: React.FC = () => {
    const { address } = useWallet();
    const { toast } = useToast();
    const [batchId, setBatchId] = useState('');
    const [fraudProof, setFraudProof] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!address) {
            toast({
                title: 'Error',
                description: 'Please connect your wallet first',
                variant: 'destructive',
            });
            return;
        }

        if (!batchId || !fraudProof) {
            toast({
                title: 'Error',
                description: 'Batch ID and fraud proof are required',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('http://localhost:5500/api/rollup/fraud-proof', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    batchId,
                    challengerAddress: address,
                    fraudProof,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to submit fraud proof');
            }

            const data = await response.json();

            toast({
                title: 'Success',
                description: 'Fraud proof submitted successfully',
            });

            setBatchId('');
            setFraudProof('');
        } catch (error) {
            console.error('Error submitting fraud proof:', error);
            toast({
                title: 'Error',
                description: 'Failed to submit fraud proof',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Submit Fraud Proof</CardTitle>
                <CardDescription>
                    Submit a fraud proof to challenge a batch of transactions
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="batchId">Batch ID</Label>
                        <Input
                            id="batchId"
                            placeholder="Enter the batch ID to challenge"
                            value={batchId}
                            onChange={(e) => setBatchId(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fraudProof">Fraud Proof</Label>
                        <Textarea
                            id="fraudProof"
                            placeholder="Enter the fraud proof data"
                            value={fraudProof}
                            onChange={(e) => setFraudProof(e.target.value)}
                            className="min-h-[200px]"
                            required
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSubmitting || !address}>
                        {isSubmitting ? 'Submitting...' : 'Submit Fraud Proof'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
};

export default FraudProof; 