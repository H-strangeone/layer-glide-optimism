import { useState, useEffect } from 'react';
import { connectWallet, disconnectWallet } from '@/lib/ethers';

export function useWallet() {
    const [address, setAddress] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check if already connected
        const checkConnection = async () => {
            try {
                const isConnected = localStorage.getItem('walletConnected');
                const lastConnectedAddress = localStorage.getItem('lastConnectedAddress');

                if (isConnected && lastConnectedAddress) {
                    const accounts = await window.ethereum.request({
                        method: "eth_accounts"
                    });

                    if (accounts[0]?.toLowerCase() === lastConnectedAddress.toLowerCase()) {
                        setAddress(accounts[0]);
                        setIsConnected(true);
                    } else {
                        // Clear stale connection
                        localStorage.removeItem('walletConnected');
                        localStorage.removeItem('lastConnectedAddress');
                    }
                }
            } catch (error) {
                console.error("Error checking connection:", error);
            }
        };

        checkConnection();

        // Setup event listeners
        const handleAccountsChanged = (accounts: string[]) => {
            if (accounts.length === 0) {
                // Disconnected
                setAddress(null);
                setIsConnected(false);
                localStorage.removeItem('walletConnected');
                localStorage.removeItem('lastConnectedAddress');
            } else {
                // Connected or switched account
                setAddress(accounts[0]);
                setIsConnected(true);
                localStorage.setItem('walletConnected', 'true');
                localStorage.setItem('lastConnectedAddress', accounts[0]);
            }
        };

        const handleChainChanged = () => {
            window.location.reload();
        };

        if (window.ethereum) {
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);
        }

        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            }
        };
    }, []);

    const connect = async () => {
        if (isConnecting) return;

        setIsConnecting(true);
        setError(null);

        try {
            const result = await connectWallet();
            setAddress(result.address);
            setIsConnected(true);
        } catch (error) {
            setError(error instanceof Error ? error.message : "Failed to connect wallet");
            setIsConnected(false);
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnect = async () => {
        try {
            await disconnectWallet();
            setAddress(null);
            setIsConnected(false);
        } catch (error) {
            setError(error instanceof Error ? error.message : "Failed to disconnect wallet");
        }
    };

    return {
        address,
        isConnected,
        isConnecting,
        error,
        connect,
        disconnect
    };
} 