
import { toast } from "@/components/ui/use-toast";
import { Transaction } from "./merkleTree";

const API_URL = "http://localhost:5500/api";

// Interface for batch data
export interface Batch {
  id: string;
  transactionsRoot: string;
  transactions: Transaction[];
  timestamp: string;
  verified: boolean;
  finalized: boolean;
}

// Interface for transaction status
export interface TransactionStatus {
  id: string;
  status: "pending" | "confirmed" | "failed";
  hash: string;
  from: string;
  to: string;
  amount: string;
  timestamp: string;
  batchId?: string;
}

// Fetch batches from the backend
export const fetchBatches = async (): Promise<Batch[]> => {
  try {
    const response = await fetch(`${API_URL}/batches`);
    if (!response.ok) {
      throw new Error("Failed to fetch batches");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching batches:", error);
    toast({
      title: "Error",
      description: "Failed to fetch batches. Please try again later.",
      variant: "destructive",
    });
    return [];
  }
};

// Fetch batch by ID
export const fetchBatchById = async (batchId: string): Promise<Batch | null> => {
  try {
    const response = await fetch(`${API_URL}/batches/${batchId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch batch");
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching batch ${batchId}:`, error);
    toast({
      title: "Error",
      description: `Failed to fetch batch ${batchId}. Please try again later.`,
      variant: "destructive",
    });
    return null;
  }
};

// Submit transactions to the backend
export const submitTransactions = async (transactions: Transaction[]): Promise<string> => {
  try {
    const response = await fetch(`${API_URL}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transactions }),
    });

    if (!response.ok) {
      throw new Error("Failed to submit transactions");
    }

    const { batchId } = await response.json();
    return batchId;
  } catch (error) {
    console.error("Error submitting transactions:", error);
    toast({
      title: "Error",
      description: "Failed to submit transactions. Please try again later.",
      variant: "destructive",
    });
    throw error;
  }
};

// Fetch transaction status
export const fetchTransactionStatus = async (address: string): Promise<TransactionStatus[]> => {
  try {
    const response = await fetch(`${API_URL}/transactions?address=${address}`);
    if (!response.ok) {
      throw new Error("Failed to fetch transaction status");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching transaction status:", error);
    toast({
      title: "Error",
      description: "Failed to fetch transaction status. Please try again later.",
      variant: "destructive",
    });
    return [];
  }
};

// Fetch fraud proof for a transaction
export const fetchFraudProof = async (batchId: string, transactionIndex: number): Promise<{
  fraudProof: string;
  merkleProof: string[];
}> => {
  try {
    const response = await fetch(`${API_URL}/proof/${batchId}/${transactionIndex}`);
    if (!response.ok) {
      throw new Error("Failed to fetch fraud proof");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching fraud proof:", error);
    toast({
      title: "Error",
      description: "Failed to fetch fraud proof. Please try again later.",
      variant: "destructive",
    });
    throw error;
  }
};

// For demo purposes - these are mock implementations
// In a real app, these would interact with the backend
export const getMockBatches = (): Batch[] => {
  return [
    {
      id: "1",
      transactionsRoot: "0x123...",
      transactions: [
        { sender: "0x123...", recipient: "0x456...", amount: "0.1" },
        { sender: "0x789...", recipient: "0xabc...", amount: "0.2" },
      ],
      timestamp: new Date().toISOString(),
      verified: true,
      finalized: false,
    },
    {
      id: "2",
      transactionsRoot: "0x456...",
      transactions: [
        { sender: "0xdef...", recipient: "0xghi...", amount: "0.3" },
      ],
      timestamp: new Date().toISOString(),
      verified: false,
      finalized: false,
    },
  ];
};

export const getMockTransactionStatus = (address: string): TransactionStatus[] => {
  return [
    {
      id: "tx1",
      status: "confirmed",
      hash: "0x123...",
      from: address,
      to: "0x456...",
      amount: "0.1",
      timestamp: new Date().toISOString(),
      batchId: "1",
    },
    {
      id: "tx2",
      status: "pending",
      hash: "0x789...",
      from: address,
      to: "0xabc...",
      amount: "0.2",
      timestamp: new Date().toISOString(),
    },
  ];
};
