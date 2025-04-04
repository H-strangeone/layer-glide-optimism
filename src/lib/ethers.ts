import { BrowserProvider, Contract, formatEther, parseEther, formatUnits, TransactionResponse, TransactionReceipt as EthersTransactionReceipt, Block, JsonRpcSigner } from "ethers";

import { toast } from "@/components/ui/use-toast";
import { db } from './db';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Layer2Scaling contract ABI
const contractABI = [
  "function depositFunds() external payable",
  "function withdrawFunds(uint256 _amount) external",
  "function balances(address) external view returns (uint256)",
  "function batchTransfer(address[] memory recipients, uint256[] memory amounts) external payable",
  "function submitBatch(bytes32[] memory _transactionsRoots) external",
  "function verifyBatch(uint256 _batchId) external",
  "function reportFraud(uint256 _batchId, bytes32 _fraudProof, tuple(address sender, address recipient, uint256 amount) memory _tx, bytes32[] memory _merkleProof) external",
  "function batches(uint256) external view returns (uint256 batchId, bytes32 transactionsRoot, uint256 timestamp, bool verified, bool finalized)",
  "function nextBatchId() external view returns (uint256)",
  "function admin() external view returns (address)",
  "function isOperator(address) external view returns (bool)",
  "event BatchSubmitted(uint256 indexed batchId, bytes32 transactionsRoot)",
  "event FundsDeposited(address indexed user, uint256 amount)",
  "event FundsWithdrawn(address indexed user, uint256 amount)",
  "event TransactionSubmitted(address indexed sender, address indexed recipient, uint256 amount, bytes32 transactionHash)",
  "event BatchFinalized(uint256 indexed batchId, bytes32 transactionsRoot, uint256 timestamp)"
];

// Contract addresses - replace with your deployed contract address
export const CONTRACT_ADDRESS = {
  sepolia: "0xff7c362B5004d2d78364D0a5c98649643A2f7CB7",
  localhost: "0x5FbDB2315678afecb367f032d93F642f64180aa3"  // Local Hardhat deployment
};

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

// Ethers provider setup
export const getProvider = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }
  return new BrowserProvider(window.ethereum);
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

// Get Layer 2 balance from both contract and database
export const getLayer2Balance = async (address: string): Promise<string> => {
  try {
    const contract = await getContract();
    const contractBalance = await contract.balances(address);
    const formattedBalance = formatEther(contractBalance);

    // Update balance in database via API
    try {
      await updateLayer2Balance(address, contract.target as string, formattedBalance);
    } catch (updateError) {
      console.warn('Failed to update balance in database:', updateError);
      // Continue with contract balance even if update fails
    }

    return formattedBalance;
  } catch (error) {
    console.error('Error getting Layer 2 balance:', error);

    // Try to get balance from database as fallback
    try {
      const response = await fetch(`http://localhost:5500/api/balance/${address}`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Balance fetch failed:', errorData);
        throw new Error(`Failed to fetch balance: ${response.status}`);
      }

      const data = await response.json();
      return data.balance || '0';
    } catch (dbError) {
      console.error('Error getting balance from database:', dbError);
      return '0';
    }
  }
};

// Update deposit function to track balances
export const depositFunds = async (amount: string): Promise<void> => {
  try {
    console.log('Starting deposit process...');
    const provider = await getProvider();
    const signer = await provider.getSigner();

    if (!signer) {
      throw new Error('No signer available');
    }

    const address = await signer.getAddress();
    if (!address) {
      throw new Error('No address available');
    }

    const contract = new Contract(
      CONTRACT_ADDRESS.localhost,
      contractABI,
      signer
    );

    console.log('Contract target:', contract.target);

    // Convert amount to wei
    const amountInWei = parseEther(amount);

    // Send the transaction with value
    const tx = await contract.depositFunds({ value: amountInWei });
    console.log('Transaction sent:', tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt);

    // Update the Layer 2 balance
    await updateLayer2Balance(address, contract.target as string, amount);

    toast({
      title: "Deposit Successful",
      description: `Successfully deposited ${amount} ETH to Layer 2. New balance: ${amount} ETH`,
    });

  } catch (error) {
    console.error('Deposit error:', error);
    toast({
      title: "Deposit Failed",
      description: error instanceof Error ? error.message : "Failed to deposit funds",
      variant: "destructive",
    });
    throw error;
  }
};

// Withdraw funds from L2
export const withdrawFunds = async (amount: string) => {
  try {
    const contract = await getContract();
    const tx = await contract.withdrawFunds(parseEther(amount));
    return await tx.wait();
  } catch (error) {
    console.error("Error withdrawing funds:", error);
    throw error;
  }
};

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface Batch {
  id: number;
  transactions: string[];
  status: 'pending' | 'submitted' | 'confirmed';
  timestamp: number;
}

// Get transaction batches
export const getBatches = async (): Promise<Batch[]> => {
  try {
    // First check if we have a connected account
    const accounts = await window.ethereum.request({
      method: "eth_accounts"
    });

    if (accounts.length === 0) {
      return [];
    }

    const provider = await getProvider();
    const contract = await getContract();
    const nextBatchId = await contract.nextBatchId();
    const batches: Batch[] = [];

    // Fetch all batches from 1 to nextBatchId-1
    for (let i = 1; i < Number(nextBatchId); i++) {
      const batch = await contract.batches(i);
      batches.push({
        id: Number(batch.batchId),
        transactions: [batch.transactionsRoot],
        status: batch.finalized ? 'confirmed' : batch.verified ? 'submitted' : 'pending',
        timestamp: Number(batch.timestamp)
      });
    }

    return batches;
  } catch (error) {
    console.error('Error fetching batches:', error);
    return [];
  }
};

export interface TransactionReceipt {
  status: TransactionStatus;
  effectiveGasPrice?: bigint;
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

// Update the getTransactionStatus function to return TransactionReceipt
export const getTransactionStatus = async (hash: string): Promise<TransactionReceipt> => {
  try {
    const provider = await getProvider();
    const receipt = await provider.getTransactionReceipt(hash) as EthersTransactionReceipt;

    if (!receipt) {
      return { status: 'pending' };
    }

    if (receipt.status === 0) {
      return { status: 'failed' };
    }

    const result: TransactionReceipt = {
      status: 'confirmed'
    };

    if ('effectiveGasPrice' in receipt && typeof receipt.effectiveGasPrice === 'bigint') {
      result.effectiveGasPrice = receipt.effectiveGasPrice;
    }

    return result;
  } catch (error) {
    console.error('Error getting transaction status:', error);
    return { status: 'failed' };
  }
};

// Subscribe to transaction events
export const subscribeToTransactionEvents = async (callback: (event: any) => void) => {
  try {
    const contract = await getContract();

    // Subscribe to all relevant events
    contract.on("TransactionSubmitted", callback);
    contract.on("BatchSubmitted", callback);
    contract.on("BatchFinalized", callback);

    return () => {
      contract.removeAllListeners();
    };
  } catch (error) {
    console.error("Error subscribing to events:", error);
    return () => { };
  }
};

export interface TransactionHistory {
  hash: string;
  from: string;
  to: string;
  value: bigint;
  status: 'pending' | 'confirmed' | 'failed';
  gasPrice?: bigint;
  timestamp: number;
}

export const getTransactionHistory = async (address: string): Promise<TransactionHistory[]> => {
  try {
    const provider = await getProvider();
    const contract = await getContract();
    const currentBlock = await provider.getBlockNumber();
    const startBlock = Math.max(0, currentBlock - 10); // Last 10 blocks for local testing
    const transactions: TransactionHistory[] = [];

    // Get L1 transactions
    for (let blockNumber = startBlock; blockNumber <= currentBlock; blockNumber++) {
      const block = await provider.getBlock(blockNumber, true) as Block;
      if (!block || !block.transactions) continue;

      for (const tx of block.transactions) {
        const transaction = tx as unknown as TransactionResponse;
        if (!transaction) continue;

        const fromAddress = transaction.from?.toLowerCase() || '';
        const toAddress = transaction.to?.toLowerCase() || '';
        const userAddress = address.toLowerCase();

        if (fromAddress === userAddress || toAddress === userAddress) {
          const receipt = await provider.getTransactionReceipt(transaction.hash);

          // Convert gasPrice to bigint if it's a string
          let gasPrice = transaction.gasPrice;
          if (typeof gasPrice === 'string') {
            gasPrice = BigInt(gasPrice);
          }

          transactions.push({
            hash: transaction.hash,
            from: transaction.from,
            to: transaction.to || '',
            value: transaction.value,
            status: receipt ? (receipt.status === 1 ? 'confirmed' : 'failed') : 'pending',
            gasPrice: gasPrice,
            timestamp: Number(block.timestamp)
          });
        }
      }
    }

    // Sort by timestamp descending
    return transactions.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return [];
  }
};

// Submit batch
export const submitBatch = async (transactionRoots: string[]) => {
  try {
    const contract = await getContract();
    const tx = await contract.submitBatch(transactionRoots);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error("Error submitting batch:", error);
    throw error;
  }
};

// Batch transfer
export const batchTransfer = async (recipients: string[], amounts: string[]) => {
  try {
    const contract = await getContract();

    // Convert amounts to wei
    const amountsInWei = amounts.map(a => parseEther(a));

    // Calculate total amount to check against Layer 2 balance
    const totalAmount = amountsInWei.reduce(
      (sum, amount) => sum + amount,
      parseEther("0")
    );

    // Get sender's Layer 2 balance
    const signer = await contract.signer.getAddress();
    const layer2Balance = await contract.balances(signer);

    // Check if sender has enough Layer 2 balance
    if (layer2Balance < totalAmount) {
      throw new Error("Insufficient Layer 2 balance");
    }

    // Call batchTransfer without value parameter since we're using Layer 2 balance
    const tx = await contract.batchTransfer(
      recipients,
      amountsInWei
    );

    return await tx.wait();
  } catch (error) {
    console.error("Error in batch transfer:", error);
    throw error;
  }
};

// Verify batch
export const verifyBatch = async (batchId: number) => {
  try {
    const contract = await getContract();
    const tx = await contract.verifyBatch(batchId);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error("Error verifying batch:", error);
    throw error;
  }
};

// Finalize batch
export const finalizeBatch = async (batchId: number) => {
  try {
    const contract = await getContract();
    const tx = await contract.finalizeBatch(batchId);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error("Error finalizing batch:", error);
    throw error;
  }
};

// Get next batch ID
export const getNextBatchId = async (): Promise<number> => {
  try {
    const contract = await getContract();
    const id = await contract.nextBatchId();
    return Number(id);
  } catch (error) {
    console.error("Error getting next batch ID:", error);
    return 0;
  }
};

// Report fraud
export const reportFraud = async (
  batchId: number,
  fraudProof: string,
  transaction: { sender: string; recipient: string; amount: string },
  merkleProof: string[]
) => {
  try {
    const contract = await getContract();
    const tx = await contract.reportFraud(
      batchId,
      fraudProof,
      {
        sender: transaction.sender,
        recipient: transaction.recipient,
        amount: parseEther(transaction.amount),
      },
      merkleProof
    );
    return await tx.wait();
  } catch (error) {
    console.error("Error reporting fraud:", error);
    throw error;
  }
};

// Helper functions for Merkle tree implementation
export const hashTransaction = (sender: string, recipient: string, amount: string) => {
  // This is a simplified version. In production, use a proper library for this.
  const data = `${sender}${recipient}${amount}`;
  return "0x" + Array.from(new TextEncoder().encode(data))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
};

// Add isAdmin function
export const isAdmin = async (address: string): Promise<boolean> => {
  try {
    const provider = await getProvider();
    const chainId = await provider.send('eth_chainId', []);
    const contract = await getContract();

    console.log('Checking admin status for address:', address);
    const adminAddress = await contract.admin();
    console.log('Admin address from contract:', adminAddress);

    const isMatch = adminAddress.toLowerCase() === address.toLowerCase();
    console.log('Is admin match:', isMatch);

    return isMatch;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Get contract instance
export const getContract = async () => {
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }

    const provider = await getProvider();
    const signer = await provider.getSigner();

    if (!signer) {
      throw new Error("No signer available. Please connect your wallet.");
    }

    const chainId = await provider.send('eth_chainId', []);
    const network = chainId === NETWORK_SETTINGS.sepolia.chainId ? 'sepolia' : 'localhost';
    const contractAddress = CONTRACT_ADDRESS[network as keyof typeof CONTRACT_ADDRESS];

    return new Contract(contractAddress, contractABI, signer);
  } catch (error) {
    console.error("Error getting contract instance:", error);
    throw error;
  }
};

// Get Layer 1 balance for a user
export const getLayer1Balance = async (address: string): Promise<string> => {
  try {
    const provider = await getProvider();
    const balance = await provider.getBalance(address);
    return formatEther(balance);
  } catch (error) {
    console.error('Error getting Layer 1 balance:', error);
    return '0';
  }
};


