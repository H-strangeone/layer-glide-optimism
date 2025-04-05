import React from 'react';
import { WagmiConfig } from 'wagmi';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import Navbar from './components/Navbar';
import Index from './pages/Index';
import Transactions from './pages/Transactions';
import Withdraw from './pages/Withdraw';
import Admin from './pages/Admin';
import Batches from './pages/batches';
import FraudProofPage from './pages/fraud-proof';
import NotFound from './pages/NotFound';
import { config } from './lib/wagmi';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WagmiConfig config={config}>
          <Router>
            <div className="min-h-screen bg-l2-bg">
              <Navbar />
              <main className="container mx-auto px-4 py-8">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/batches" element={<Batches />} />
                  <Route path="/withdraw" element={<Withdraw />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/fraud-proof" element={<FraudProofPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </Router>
        </WagmiConfig>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
