import type { Metadata } from "next";
import "@fontsource/inter";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { WalletProvider } from "@/hooks/useWallet";

export const metadata: Metadata = {
    title: "L2 Optimistic Rollup",
    description: "Layer 2 scaling solution with optimistic rollups",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="font-inter">
                <WalletProvider>
                    <div className="min-h-screen bg-[#0a0b14]">
                        <nav className="bg-[#1a1b26] border-b border-purple-400/20">
                            <div className="container mx-auto px-4 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <h1 className="text-xl font-bold text-purple-400">L2 Optimistic Rollup</h1>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <WalletStatus />
                                    </div>
                                </div>
                            </div>
                        </nav>
                        <main className="container mx-auto px-4 py-8">
                            {children}
                        </main>
                    </div>
                    <Toaster />
                </WalletProvider>
            </body>
        </html>
    );
}

function WalletStatus() {
    return (
        <div id="wallet-status">
            {/* Wallet status will be injected here by the WalletProvider */}
        </div>
    );
} 