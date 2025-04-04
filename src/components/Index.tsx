import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@/hooks/useWallet";

export default function Index() {
    const { isConnected } = useWallet();

    if (!isConnected) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Welcome to Layer 2 Scaling</CardTitle>
                <CardDescription>Optimistic Rollup Implementation</CardDescription>
            </CardHeader>
            <CardContent>
                <p>This is a Layer 2 scaling solution that uses optimistic rollups to increase transaction throughput and reduce gas fees.</p>
                <p className="mt-4">Connect your wallet to get started with deposits, transfers, and batch submissions.</p>
            </CardContent>
        </Card>
    );
} 