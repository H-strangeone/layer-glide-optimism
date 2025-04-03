
import { Contract, providers, utils } from "ethers";
import { toast } from "@/components/ui/use-toast";

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
  "event BatchSubmitted(uint256 indexed batchId, bytes32 transactionsRoot)",
  "event FundsDeposited(address indexed user, uint256 amount)",
  "event FundsWithdrawn(address indexed user, uint256 amount)"
];

// Contract addresses - replace with your deployed contract address
export const CONTRACT_ADDRESS = {
  // Add your contract address here after deployment
  sepolia: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Example address, replace with actual
  localhost: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Example address, replace with actual
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
    rpcUrls: ["https://sepolia.infura.io/v3/"],
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
  },
  localhost: {
    chainId: "0x539", // 1337 in hex
    chainName: "Localhost",
    nativeCurrency: {
      name: "Localhost Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: ["http://localhost:8545"],
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
  return new providers.Web3Provider(window.ethereum);
};

// Connect to wallet
export const connectWallet = async () => {
  try {
    const provider = await getProvider();
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    
    if (accounts.length === 0) {
      throw new Error("No accounts found");
    }
    
    // Get network information
    const network = await provider.getNetwork();
    const networkName = Object.keys(NETWORK_SETTINGS).find(
      (net) => parseInt(NETWORK_SETTINGS[net as keyof typeof NETWORK_SETTINGS].chainId, 16) === network.chainId
    ) || "unknown";
    
    return { 
      address: accounts[0], 
      network: networkName 
    };
  } catch (error) {
    console.error("Wallet connection error:", error);
    toast({
      title: "Connection Error",
      description: error instanceof Error ? error.message : "Failed to connect wallet",
      variant: "destructive",
    });
    throw error;
  }
};

// Switch network
export const switchNetwork = async (networkName: "sepolia" | "localhost") => {
  try {
    const network = NETWORK_SETTINGS[networkName];
    
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: network.chainId }],
    });
    
    return true;
  } catch (error: any) {
    // Handle the case where the network needs to be added
    if (error.code === 4902) {
      try {
        const network = NETWORK_SETTINGS[networkName];
        
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [network],
        });
        return true;
      } catch (addError) {
        console.error("Error adding network:", addError);
        return false;
      }
    }
    
    console.error("Error switching network:", error);
    return false;
  }
};

// Get contract instance
export const getContract = async (networkName: "sepolia" | "localhost" = "sepolia") => {
  const provider = await getProvider();
  const signer = provider.getSigner();
  return new Contract(CONTRACT_ADDRESS[networkName], contractABI, signer);
};

// Get user balance
export const getUserBalance = async (address: string) => {
  try {
    const provider = await getProvider();
    const ethBalance = await provider.getBalance(address);
    
    const contract = await getContract();
    const l2Balance = await contract.balances(address);
    
    return {
      ethBalance: utils.formatEther(ethBalance),
      l2Balance: utils.formatEther(l2Balance),
    };
  } catch (error) {
    console.error("Error getting balance:", error);
    return { ethBalance: "0", l2Balance: "0" };
  }
};

// Deposit funds to L2
export const depositFunds = async (amount: string) => {
  try {
    const contract = await getContract();
    const tx = await contract.depositFunds({ value: utils.parseEther(amount) });
    return await tx.wait();
  } catch (error) {
    console.error("Error depositing funds:", error);
    throw error;
  }
};

// Withdraw funds from L2
export const withdrawFunds = async (amount: string) => {
  try {
    const contract = await getContract();
    const tx = await contract.withdrawFunds(utils.parseEther(amount));
    return await tx.wait();
  } catch (error) {
    console.error("Error withdrawing funds:", error);
    throw error;
  }
};

// Submit batch of transactions
export const submitBatch = async (transactionsRoots: string[]) => {
  try {
    const contract = await getContract();
    const tx = await contract.submitBatch(transactionsRoots);
    return await tx.wait();
  } catch (error) {
    console.error("Error submitting batch:", error);
    throw error;
  }
};

// Batch transfer
export const batchTransfer = async (recipients: string[], amounts: string[]) => {
  try {
    const contract = await getContract();
    const totalAmount = amounts.reduce(
      (sum, amount) => sum.add(utils.parseEther(amount)),
      utils.parseEther("0")
    );
    
    const tx = await contract.batchTransfer(
      recipients, 
      amounts.map(a => utils.parseEther(a)), 
      { value: totalAmount }
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
    return await tx.wait();
  } catch (error) {
    console.error("Error verifying batch:", error);
    throw error;
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
        amount: utils.parseEther(transaction.amount),
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

// Get transaction batches
export const getBatches = async () => {
  try {
    const contract = await getContract();
    const nextBatchId = await contract.nextBatchId();
    
    const batches = [];
    for (let i = 1; i < nextBatchId; i++) {
      const batch = await contract.batches(i);
      batches.push({
        id: batch.batchId.toString(),
        transactionsRoot: batch.transactionsRoot,
        timestamp: new Date(Number(batch.timestamp) * 1000).toISOString(),
        verified: batch.verified,
        finalized: batch.finalized,
      });
    }
    
    return batches;
  } catch (error) {
    console.error("Error getting batches:", error);
    return [];
  }
};
