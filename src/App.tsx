import React from 'react';
import { WagmiConfig } from 'wagmi';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from "@/components/ui/tooltip";
import { config } from './lib/wagmi';
import Navbar from './components/Navbar';
import { TransactionTracker } from './components/TransactionTracker';
import { AdminBatchManager } from './components/AdminBatchManager';
import { NetworkStatus } from './components/NetworkStatus';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import Index from "./pages/Index";
import Transactions from "./pages/Transactions";
import Withdraw from "./pages/Withdraw";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WagmiConfig config={config}>
          <BrowserRouter>
            <div className="min-h-screen bg-l2-bg">
              <Navbar />
              <main className="container mx-auto px-4 py-8">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/withdraw" element={<Withdraw />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </WagmiConfig>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
