import { BrowserProvider, Contract, formatEther, parseEther, formatUnits, TransactionResponse, TransactionReceipt as EthersTransactionReceipt, Block, JsonRpcSigner } from "ethers";
import { ethers, EventLog, Log } from 'ethers';

import { toast } from "@/components/ui/use-toast";
import { db } from './db';
import { PrismaClient } from '@prisma/client';
import { CONTRACT_ADDRESS } from "@/config/contract";

const prisma = new PrismaClient();

// Contract ABI
const CONTRACT_ABI = [
  "function depositFunds() payable",
  "function withdrawFunds(uint256 _amount)",
  "function executeL2Transaction(address _recipient, uint256 _amount)",
  "function executeL2BatchTransaction(address[] _recipients, uint256[] _amounts)",
  "function submitBatch(bytes32[] _transactionsRoots)",
  "function verifyBatch(uint256 _batchId)",
  "function finalizeBatch(uint256 _batchId)",
  "function reportFraud(uint256 _batchId, bytes32 _fraudProof, tuple(address sender, address recipient, uint256 amount) _tx, bytes32[] _merkleProof)",
  "function balances(address) view returns (uint256)",
  "function admin() view returns (address)",
  "function isOperator(address) view returns (bool)",
  "function changeAdmin(address newAdmin)",
  "function addOperator(address operator)",
  "function removeOperator(address operator)",
  "function nextBatchId() view returns (uint256)",
  "function slashingPenalty() view returns (uint256)",
  "function batches(uint256) view returns (uint256 batchId, bytes32 transactionsRoot, uint256 timestamp, bool verified, bool finalized)",
  "event TransactionExecuted(address indexed from, address indexed to, uint256 value, uint256 timestamp, uint256 indexed batchId)",
  "event BatchSubmitted(uint256 indexed batchId, bytes32 transactionsRoot)",
  "event BatchVerified(uint256 indexed batchId)",
  "event BatchFinalized(uint256 indexed batchId)",
  "event FraudReported(uint256 indexed batchId, bytes32 fraudProof)",
  "event AdminChanged(address indexed previousAdmin, address indexed newAdmin)",
  "event OperatorAdded(address indexed operator)",
  "event OperatorRemoved(address indexed operator)",
  "event FundsDeposited(address indexed user, uint256 amount)",
  "event FundsWithdrawn(address indexed user, uint256 amount)",
  "event FraudPenaltyApplied(address indexed user, uint256 penalty)"
];

// Network settings
export const NETWORK_SETTINGS = {
  sepolia: {
    chainId: "0xaa36a7", // 11155111 in hex
    chainName: "Sepolia",
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: ["https://eth-sepolia.infura.io/v3/", "https://eth-sepolia.g.alchemy.com/v2/"],
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
  },
  localhost: {
    chainId: "0x539", // 1337 in hex
    chainName: "Hardhat",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: ["http://127.0.0.1:8545"],
    blockExplorerUrls: [],
  },
};

// Define a type for window with ethereum property
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Transaction types
export interface TransactionHistory {
  hash: string;
  from: string;
  to: string;
  value: string;
  status: string;
  gasPrice: string;
  timestamp: number;
}

export interface TransactionEvent {
  eventName: string;
  args: {
    transactionHash: string;
    from: string;
    to: string;
    value: bigint;
  };
}

export interface TransactionReceipt {
  status: string;
  effectiveGasPrice?: bigint;
}

export type TransactionStatus = "pending" | "confirmed" | "failed";

interface Batch {
  id: string;
  transactionsRoot: string;
  timestamp: string;
  verified: boolean;
  finalized: boolean;
}

// Initialize provider and contract
const getProvider = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }
  return new BrowserProvider(window.ethereum);
};

// Get contract instance
export const getContract = async () => {
  try {
    const provider = await getProvider();

    // First verify that we're connected to the correct network
    const network = await provider.getNetwork();
    console.log('Connected to network:', network.name, 'chainId:', network.chainId);

    // Get the signer
    const signer = await provider.getSigner();
    console.log('Signer address:', await signer.getAddress());

    // Verify that the contract exists at the specified address
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === '0x') {
      console.error('No contract deployed at address:', CONTRACT_ADDRESS);
      throw new Error(`No contract deployed at ${CONTRACT_ADDRESS}`);
    }

    // Create contract instance
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    // Test if the contract is accessible and has the correct interface
    try {
      // Try to call a view function that should always work
      const adminAddress = await contract.admin();
      console.log('Contract initialized successfully, admin:', adminAddress);
      return contract;
    } catch (error: any) {
      console.error('Contract interface error:', error);
      if (error.message.includes('call revert exception')) {
        throw new Error('Contract call reverted. Please check if you are connected to the correct network.');
      } else if (error.message.includes('BAD_DATA')) {
        throw new Error('Contract interface mismatch. The ABI might not match the deployed contract.');
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error initializing contract:', error);
    if (error.message.includes('MetaMask is not installed')) {
      throw new Error('Please install MetaMask to interact with the blockchain.');
    } else if (error.message.includes('user rejected')) {
      throw new Error('Please connect your wallet to continue.');
    } else if (error.message.includes('network')) {
      throw new Error('Please connect to the correct network (Hardhat or Sepolia).');
    }
    throw new Error('Failed to initialize contract. Please check your wallet connection and network.');
  }
};

// Get transaction history for an address
export const getTransactionHistory = async (address: string): Promise<TransactionHistory[]> => {
  try {
    // First try to get from the blockchain
    try {
      const contract = await getContract();
      const provider = await getProvider();

      // Get all TransactionExecuted events for this address
      const filter = contract.filters.TransactionExecuted(address);
      const events = await contract.queryFilter(filter);

      // Convert events to TransactionHistory format
      const transactions = await Promise.all(events.map(async (event) => {
        const block = await provider.getBlock(event.blockNumber);
        // Cast event to EventLog to access args
        const eventLog = event as ethers.EventLog;
        return {
          hash: event.transactionHash,
          from: eventLog.args[0], // sender
          to: eventLog.args[1],   // recipient
          value: eventLog.args[2].toString(), // amount
          status: "confirmed", // Since we're getting past events, they're confirmed
          gasPrice: eventLog.args[3]?.toString() || "0", // gas price if available
          timestamp: block?.timestamp || Math.floor(Date.now() / 1000)
        };
      }));

      return transactions;
    } catch (error) {
      console.error("Error getting transaction history from blockchain:", error);

      // If blockchain fails, try to get from the API
      try {
        const response = await fetch(`http://localhost:5500/api/transactions?address=${address}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (apiError) {
        console.error("Error getting transaction history from API:", apiError);
        return [];
      }
    }
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return [];
  }
};

// Get transaction status
export const getTransactionStatus = async (hash: string): Promise<TransactionReceipt> => {
  try {
    const provider = await getProvider();
    const receipt = await provider.getTransactionReceipt(hash);

    if (!receipt) {
      return { status: "pending" };
    }

    return {
      status: receipt.status === 1 ? "confirmed" : "failed",
      effectiveGasPrice: receipt.gasPrice,
    };
  } catch (error) {
    console.error("Error getting transaction status:", error);
    return { status: "failed" };
  }
};

// Subscribe to transaction events
export const subscribeToTransactionEvents = async (callback: (event: TransactionEvent) => void): Promise<() => void> => {
  const contract = await getContract();

  // Subscribe to TransactionExecuted events
  contract.on("TransactionExecuted", (sender, recipient, amount, event) => {
    callback({
      eventName: "TransactionSubmitted",
      args: {
        transactionHash: event.transactionHash,
        from: sender,
        to: recipient,
        value: amount,
      },
    });
  });

  // Return unsubscribe function
  return () => {
    contract.removeAllListeners();
  };
};

// Deposit funds to Layer 2
export const depositFunds = async (amount: string) => {
  try {
    const contract = await getContract();
    const tx = await contract.depositFunds({
      value: parseEther(amount)
    });
    await tx.wait();
    toast({
      title: "Success",
      description: "Funds deposited successfully",
    });
    return tx;
  } catch (error) {
    console.error("Error depositing funds:", error);
    toast({
      title: "Error",
      description: "Failed to deposit funds",
      variant: "destructive",
    });
    throw error;
  }
};

// Withdraw funds from Layer 2
export const withdrawFunds = async (amount: string) => {
  try {
    const contract = await getContract();
    const tx = await contract.withdrawFunds(
      parseEther(amount)
    );
    await tx.wait();
    toast({
      title: "Success",
      description: "Withdrawal initiated successfully",
    });
    return tx;
  } catch (error) {
    console.error("Error withdrawing funds:", error);
    toast({
      title: "Error",
      description: "Failed to withdraw funds",
      variant: "destructive",
    });
    throw error;
  }
};

// Execute a single Layer 2 transaction
export const executeL2Transaction = async (recipient: string, amount: string) => {
  try {
    const contract = await getContract();
    const tx = await contract.executeL2Transaction(
      recipient,
      parseEther(amount)
    );
    await tx.wait();
    toast({
      title: "Success",
      description: "Transaction executed successfully",
    });
    return tx;
  } catch (error) {
    console.error("Error executing transaction:", error);
    toast({
      title: "Error",
      description: "Failed to execute transaction",
      variant: "destructive",
    });
    throw error;
  }
};

// Execute a batch of Layer 2 transactions
export const executeL2BatchTransaction = async (recipients: string[], amounts: string[]) => {
  try {
    const contract = await getContract();
    const weiAmounts = amounts.map(amount => parseEther(amount));
    const tx = await contract.executeL2BatchTransaction(
      recipients,
      weiAmounts
    );
    await tx.wait();
    toast({
      title: "Success",
      description: "Batch transaction executed successfully",
    });
    return tx;
  } catch (error) {
    console.error("Error executing batch transaction:", error);
    toast({
      title: "Error",
      description: "Failed to execute batch transaction",
      variant: "destructive",
    });
    throw error;
  }
};

// Alias for executeL2BatchTransaction for backward compatibility
export const batchTransfer = executeL2BatchTransaction;

// Submit a batch with Merkle root
export const submitBatchWithMerkleRoot = async (merkleRoot: string) => {
  try {
    const contract = await getContract();
    // Convert the merkleRoot to an array since the contract expects bytes32[]
    const tx = await contract.submitBatch([merkleRoot]);
    await tx.wait();
    toast({
      title: "Success",
      description: "Batch submitted successfully",
    });
    return tx;
  } catch (error) {
    console.error("Error submitting batch:", error);
    toast({
      title: "Error",
      description: "Failed to submit batch",
      variant: "destructive",
    });
    throw error;
  }
};

// Verify a batch
export const verifyBatch = async (batchId: string) => {
  try {
    const contract = await getContract();
    // Convert the string batchId to a numeric hash
    const numericBatchId = parseInt(ethers.keccak256(ethers.toUtf8Bytes(batchId)).slice(0, 8), 16);
    const tx = await contract.verifyBatch(numericBatchId);
    await tx.wait();
    toast({
      title: "Success",
      description: "Batch verified successfully",
    });
    return tx;
  } catch (error) {
    console.error("Error verifying batch:", error);
    toast({
      title: "Error",
      description: "Failed to verify batch",
      variant: "destructive",
    });
    throw error;
  }
};

// Finalize a batch
export const finalizeBatch = async (batchId: number) => {
  try {
    const contract = await getContract();
    const tx = await contract.finalizeBatch(batchId);
    await tx.wait();
    toast({
      title: "Success",
      description: "Batch finalized successfully",
    });
    return tx;
  } catch (error) {
    console.error("Error finalizing batch:", error);
    toast({
      title: "Error",
      description: "Failed to finalize batch",
      variant: "destructive",
    });
    throw error;
  }
};

// Report fraud with Merkle proof
export const reportFraudWithMerkleProof = async (batchId: number, proof: string[]) => {
  try {
    const contract = await getContract();
    const tx = await contract.reportFraud(batchId, proof);
    await tx.wait();
    toast({
      title: "Success",
      description: "Fraud reported successfully",
    });
    return tx;
  } catch (error) {
    console.error("Error reporting fraud:", error);
    toast({
      title: "Error",
      description: "Failed to report fraud",
      variant: "destructive",
    });
    throw error;
  }
};

// Get Layer 1 balance
export const getLayer1Balance = async (address: string): Promise<string> => {
  try {
    // First try to get balance from the blockchain
    try {
      const provider = await getProvider();
      const balance = await provider.getBalance(address);
      return formatEther(balance);
    } catch (error) {
      console.error("Error getting Layer 1 balance from blockchain:", error);

      // If blockchain fails, try to get from the API
      try {
        const response = await fetch(`http://localhost:5500/api/balance/${address}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.layer1Balance || "0";
      } catch (apiError) {
        console.error("Error getting Layer 1 balance from API:", apiError);
        return "0";
      }
    }
  } catch (error) {
    console.error("Error fetching Layer 1 balance:", error);
    return "0";
  }
};

// Get Layer 2 balance
export const getLayer2Balance = async (address: string): Promise<string> => {
  try {
    // Try to get from the API first
    try {
      const response = await fetch(`http://localhost:5500/api/balance/${address}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      return data.layer2Balance || "0";
    } catch (apiError) {
      console.error("Error getting Layer 2 balance from API:", apiError);

      // If API fails, try to get from the blockchain
      try {
        const contract = await getContract();
        const balance = await contract.balances(address);
        return formatEther(balance);
      } catch (blockchainError) {
        console.error("Error getting Layer 2 balance from blockchain:", blockchainError);
        return "0"; // Return 0 as a fallback
      }
    }
  } catch (error) {
    console.error("Error in getLayer2Balance:", error);
    return "0"; // Return 0 as a fallback
  }
};

// Format large numbers without scientific notation
export function formatLargeNumber(value: string): string {
  try {
    const num = Number(value);
    if (isNaN(num)) return "0.000000";

    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
      useGrouping: true,
      notation: 'standard'
    }).format(num);
  } catch (error) {
    console.error("Error formatting number:", error);
    return "0.000000";
  }
}

// Get all batches (admin only)
export const getBatches = async (): Promise<Batch[]> => {
  try {
    const contract = await getContract();
    const nextBatchIdBN = await contract.nextBatchId();
    const nextBatchId = Number(nextBatchIdBN);

    const batchPromises = [];
    for (let i = Math.max(0, nextBatchId - 10); i < nextBatchId; i++) {
      batchPromises.push(
        contract.batches(i)
          .then(batch => ({
            id: batch.batchId.toString(),
            transactionsRoot: batch.transactionsRoot,
            timestamp: batch.timestamp.toString(),
            verified: batch.verified,
            finalized: batch.finalized
          }))
          .catch(() => null)
      );
    }

    const batches = await Promise.all(batchPromises);
    return batches.filter(batch => batch !== null);
  } catch (error) {
    console.error("Error fetching batches:", error);
    return [];
  }
};

// Subscribe to events
export const subscribeToEvents = async (callback: (event: any) => void) => {
  const contract = await getContract();
  contract.on("TransactionExecuted", callback);
  contract.on("BatchSubmitted", callback);
  contract.on("BatchVerified", callback);
  contract.on("BatchFinalized", callback);
  contract.on("FraudReported", callback);
};

// Unsubscribe from events
export const unsubscribeFromEvents = async () => {
  const contract = await getContract();
  contract.removeAllListeners();
};

// Determine network from chainId
export const getNetworkName = (chainId: string | number): string => {
  // Convert to hex string if it's a number
  const hexChainId = typeof chainId === 'number'
    ? `0x${chainId.toString(16)}`
    : chainId;

  switch (hexChainId) {
    case NETWORK_SETTINGS.sepolia.chainId:
      return "Sepolia";
    case NETWORK_SETTINGS.localhost.chainId:
      return "Hardhat";
    default:
      return `Chain ${parseInt(hexChainId, 16)}`;
  }
};

// Connect to wallet
export const connectWallet = async () => {
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }

    // Check if already connected
    const accounts = await window.ethereum.request({
      method: "eth_accounts"
    });

    if (accounts.length > 0) {
      // Already connected
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      const networkName = getNetworkName(chainId);

      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('lastConnectedAddress', accounts[0]);

      return {
        address: accounts[0],
        network: networkName
      };
    }

    // Request new connection
    const newAccounts = await window.ethereum.request({
      method: "eth_requestAccounts"
    });

    if (newAccounts.length === 0) {
      throw new Error("No accounts found");
    }

    // Get network information
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    const networkName = getNetworkName(chainId);

    // Store connection state
    localStorage.setItem('walletConnected', 'true');
    localStorage.setItem('lastConnectedAddress', newAccounts[0]);

    return {
      address: newAccounts[0],
      network: networkName
    };
  } catch (error) {
    console.error("Wallet connection error:", error);
    // Clear any stale connection state
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('lastConnectedAddress');
    throw error;
  }
};

// Disconnect wallet
export const disconnectWallet = async () => {
  try {
    // Clear stored connection state
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('lastConnectedAddress');

    // Remove event listeners
    if (window.ethereum) {
      window.ethereum.removeListener('chainChanged', () => { });
      window.ethereum.removeListener('accountsChanged', () => { });
    }

    // Request MetaMask to forget this site's permissions
    if (window.ethereum?.request) {
      try {
        await window.ethereum.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }]
        });
      } catch (revokeError) {
        console.warn("Could not revoke permissions:", revokeError);
      }
    }

    // Reload page to reset state
    window.location.reload();
  } catch (error) {
    console.error("Wallet disconnection error:", error);
    // Force reload even if there's an error
    window.location.reload();
  }
};

// Get current gas price
export const getGasPrice = async () => {
  try {
    const provider = await getProvider();
    const chainId = await provider.send('eth_chainId', []);

    try {
      // First try using eth_gasPrice
      const gasPrice = await provider.send('eth_gasPrice', []);
      if (gasPrice) {
        return gasPrice; // Return the raw hex value
      }
    } catch (rpcError) {
      console.warn('Failed to get gas price via eth_gasPrice');
    }

    // If eth_gasPrice fails, use getFeeData
    const feeData = await provider.getFeeData();
    if (feeData.gasPrice) {
      return feeData.gasPrice.toString(16); // Convert to hex
    }

    // Default values based on network
    if (chainId === NETWORK_SETTINGS.sepolia.chainId) {
      return "0x38D7EA4C68000"; // ~1.5 Gwei in hex
    } else if (chainId === NETWORK_SETTINGS.localhost.chainId) {
      return "0x4A817C800"; // 1 Gwei in hex
    }

    return "0x0";
  } catch (error) {
    console.error("Error getting gas price:", error);
    return "0x0";
  }
};

// Switch network
export const switchNetwork = async (networkName: "sepolia" | "localhost") => {
  try {
    const network = NETWORK_SETTINGS[networkName];

    try {
      // First try to switch
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: network.chainId }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: network.chainId,
            chainName: network.chainName,
            nativeCurrency: network.nativeCurrency,
            rpcUrls: network.rpcUrls,
            blockExplorerUrls: network.blockExplorerUrls
          }],
        });
      } else {
        throw switchError;
      }
    }

    // Wait a bit for MetaMask to update
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify we're on the correct network
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (currentChainId !== network.chainId) {
      throw new Error('Failed to switch network');
    }

    return true;
  } catch (error) {
    console.error("Error switching network:", error);
    toast({
      title: "Network Switch Failed",
      description: "Please manually switch to " + networkName + " network in MetaMask",
      variant: "destructive",
    });
    return false;
  }
};

// Track contract deployment
const trackContractDeployment = async (address: string, network: string) => {
  try {
    // Deactivate previous deployments for this network
    await prisma.contractDeployment.updateMany({
      where: { network, isActive: true },
      data: { isActive: false }
    });

    // Create new deployment record
    await prisma.contractDeployment.create({
      data: {
        address,
        network,
        isActive: true
      }
    });
  } catch (error) {
    console.error('Error tracking contract deployment:', error);
  }
};

// Update Layer 2 balance in database via API
const updateLayer2Balance = async (userAddress: string, contractAddress: string, balance: string) => {
  try {
    const response = await fetch('http://localhost:5500/api/balance/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        userAddress,
        contractAddress,
        balance
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Balance update failed:', errorData);
      throw new Error(`Failed to update balance: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating Layer 2 balance:', error);
    throw error;
  }
};

// Check if an address is an admin
export const isAdmin = async (address: string): Promise<boolean> => {
  try {
    const contract = await getContract();

    // Only check admin() function
    try {
      const adminAddress = await contract.admin();
      return adminAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      console.warn("admin() check failed:", error);

      // For development, allow hardcoded admin address
      if (process.env.NODE_ENV === 'development') {
        const hardcodedAdmin = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
        return address.toLowerCase() === hardcodedAdmin.toLowerCase();
      }
      return false;
    }
  } catch (error) {
    console.error("Error checking admin status:", error);

    // For development, allow hardcoded admin address
    if (process.env.NODE_ENV === 'development') {
      const hardcodedAdmin = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      return address.toLowerCase() === hardcodedAdmin.toLowerCase();
    }
    return false;
  }
};

// Add an operator (admin only)
export const addOperator = async (operatorAddress: string) => {
  try {
    const contract = await getContract();
    const tx = await contract.addOperator(operatorAddress);
    await tx.wait();
  } catch (error) {
    console.error("Error adding operator:", error);
    throw error;
  }
};

// Remove an operator (admin only)
export const removeOperator = async (operatorAddress: string) => {
  try {
    const contract = await getContract();
    const tx = await contract.removeOperator(operatorAddress);
    await tx.wait();
  } catch (error) {
    console.error("Error removing operator:", error);
    throw error;
  }
};

// Check if an address is an operator
export const isOperator = async (address: string): Promise<boolean> => {
  try {
    const contract = await getContract();
    return await contract.isOperator(address);
  } catch (error) {
    console.error("Error checking operator status:", error);
    return false;
  }
};

interface TransactionExecutedLog extends Log {
  args?: [string, string, bigint, bigint, bigint]; // [from, to, value, timestamp, batchId]
}

export async function getBatchTransactions(batchId: string) {
  try {
    const contract = await getContract();

    // Get batch events
    const filter = contract.filters.TransactionExecuted();
    const events = await contract.queryFilter(filter) as TransactionExecutedLog[];

    // Filter events for the specific batch
    const batchTransactions = events
      .filter(event => event.args?.[4].toString() === batchId)
      .map(event => {
        if (!event.args) return null;
        const [from, to, value, timestamp] = event.args;
        return {
          from,
          to,
          value: ethers.formatEther(value),
          status: "confirmed",
          timestamp: Number(timestamp)
        };
      })
      .filter((tx): tx is NonNullable<typeof tx> => tx !== null);

    return batchTransactions;
  } catch (error) {
    console.error("Error fetching batch transactions:", error);
    return [];
  }
}


