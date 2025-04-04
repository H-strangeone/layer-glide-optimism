import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { formatAddress } from "@/lib/utils";

export function WalletStatus() {
    const { address, isConnected, connect, disconnect } = useWallet();

    if (!isConnected) {
        return (
            <Button
                onClick={connect}
                className="bg-purple-500 hover:bg-purple-600 text-white"
            >
                Connect Wallet
            </Button>
        );
    }

    return (
        <div className="flex items-center space-x-4">
            <span className="text-purple-400">
                {formatAddress(address || '')}
            </span>
            <Button
                onClick={disconnect}
                variant="outline"
                className="border-purple-400 text-purple-400 hover:bg-purple-400/10"
            >
                Disconnect
            </Button>
        </div>
    );
} 