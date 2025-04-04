const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const { PrismaClient } = require('@prisma/client');
const MerkleTree = require('./merkleTree');
const app = express();
const PORT = 5500;
require('dotenv').config({ path: '../.env' });

const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (replace with a database in production)
const batches = [];
const transactions = [];
let nextBatchId = 1;
let nextTxId = 1;

// Contract configuration
const CONTRACT_ABI = [
  "function submitBatch(bytes32[] memory _transactionsRoots) external",
  "function batches(uint256) external view returns (uint256 batchId, bytes32 transactionsRoot, uint256 timestamp, bool verified, bool finalized)",
  "function nextBatchId() external view returns (uint256)",
  "function balances(address) external view returns (uint256)",
];

// Get contract address from .env or use default
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Network configuration
const NETWORK = process.env.NETWORK || 'localhost'; // 'localhost' or 'sepolia'

// Get Alchemy API key from .env
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

// Connect to the Ethereum network (Sepolia) via Alchemy
let provider;
let contract;

// Initialize provider and contract
const initBlockchainConnection = () => {
  try {
    if (NETWORK === 'sepolia') {
      console.log('Initializing blockchain connection with Alchemy API (Sepolia)');
      if (!ALCHEMY_API_KEY) {
        console.error('ALCHEMY_API_KEY not found in .env file.');
        return false;
      }

      provider = new ethers.providers.AlchemyProvider("sepolia", ALCHEMY_API_KEY);
      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        console.error('PRIVATE_KEY not found in .env file.');
        return false;
      }

      const wallet = new ethers.Wallet(privateKey, provider);
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

      console.log(`Connected to Sepolia network`);
    } else {
      console.log('Initializing blockchain connection with local Hardhat node');
      provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");

      // Use the default Hardhat private key for local development
      const privateKey = process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
      const wallet = new ethers.Wallet(privateKey, provider);
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

      console.log(`Connected to local network`);
    }

    console.log(`Contract address: ${CONTRACT_ADDRESS}`);
    return true;
  } catch (error) {
    console.error('Error initializing blockchain connection:', error);
    return false;
  }
};

// Initialize blockchain connection
const isConnected = initBlockchainConnection();

// API Routes

// Get all batches
app.get('/api/batches', async (req, res) => {
  try {
    if (!isConnected || !contract) {
      return res.json(getMockBatches());
    }

    // Fetch batches from the blockchain
    const nextBatchIdFromContract = await contract.nextBatchId();
    const fetchedBatches = [];

    for (let i = 1; i < Number(nextBatchIdFromContract); i++) {
      const batch = await contract.batches(i);
      fetchedBatches.push({
        id: batch.batchId.toString(),
        transactionsRoot: batch.transactionsRoot,
        timestamp: new Date(Number(batch.timestamp) * 1000).toISOString(),
        verified: batch.verified,
        finalized: batch.finalized,
        transactions: [], // We don't have transactions details from the contract
      });
    }

    res.json(fetchedBatches.length > 0 ? fetchedBatches : batches);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.json(getMockBatches());
  }
});

// Get batch by ID
app.get('/api/batches/:id', async (req, res) => {
  try {
    if (!isConnected || !contract) {
      const mockBatch = getMockBatches().find(b => b.id === req.params.id);
      return res.json(mockBatch || { error: "Batch not found" });
    }

    const batchId = req.params.id;
    const batch = await contract.batches(batchId);

    if (Number(batch.batchId) === 0) {
      return res.status(404).json({ error: "Batch not found" });
    }

    const batchData = {
      id: batch.batchId.toString(),
      transactionsRoot: batch.transactionsRoot,
      timestamp: new Date(Number(batch.timestamp) * 1000).toISOString(),
      verified: batch.verified,
      finalized: batch.finalized,
      transactions: [], // We don't have transactions details from the contract
    };

    res.json(batchData);
  } catch (error) {
    console.error(`Error fetching batch ${req.params.id}:`, error);
    const mockBatch = getMockBatches().find(b => b.id === req.params.id);
    res.json(mockBatch || { error: "Batch not found" });
  }
});

// Submit transactions
app.post('/api/transactions', async (req, res) => {
  try {
    const { transactions: txs } = req.body;

    if (!txs || !Array.isArray(txs) || txs.length === 0) {
      return res.status(400).json({ error: "Invalid transactions" });
    }

    // Create transaction objects
    const newTransactions = txs.map(tx => ({
      id: `tx${nextTxId++}`,
      sender: tx.sender,
      recipient: tx.recipient,
      amount: tx.amount,
      status: "pending",
      hash: ethers.utils.id(JSON.stringify(tx)), // Create a determinstic hash
      timestamp: new Date().toISOString(),
    }));

    // Add to transactions list
    transactions.push(...newTransactions);

    // Create a Merkle tree from the transactions
    const merkleTree = new MerkleTree(txs);
    const transactionsRoot = merkleTree.getRoot();

    // Create a new batch
    const batchId = nextBatchId++;
    const newBatch = {
      id: batchId.toString(),
      transactionsRoot,
      transactions: txs,
      timestamp: new Date().toISOString(),
      verified: false,
      finalized: false,
      merkleTree: merkleTree,
    };

    // Add to batches list
    batches.push(newBatch);

    // Submit batch to the contract if connected
    if (isConnected && contract && process.env.PRIVATE_KEY) {
      try {
        const tx = await contract.submitBatch([transactionsRoot]);
        const receipt = await tx.wait();
        console.log(`Batch submitted to blockchain. Transaction hash: ${receipt.transactionHash}`);
      } catch (error) {
        console.error('Error submitting batch to blockchain:', error);
      }
    }

    res.status(201).json({ batchId: newBatch.id });
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ error: "Failed to create batch" });
  }
});

// Get transactions by address
app.get('/api/transactions', async (req, res) => {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: "Address is required" });
  }

  try {
    // Filter local transactions by address
    const addressTransactions = transactions.filter(
      tx => tx.sender.toLowerCase() === address.toLowerCase() ||
        tx.recipient.toLowerCase() === address.toLowerCase()
    );

    // If connected to blockchain, we could fetch additional transaction data here

    if (addressTransactions.length > 0) {
      return res.json(addressTransactions);
    } else {
      // Return mock data if no transactions found
      return res.json(getMockTransactionStatus(address));
    }
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.json(getMockTransactionStatus(address));
  }
});

// Get fraud proof for a transaction
app.get('/api/proof/:batchId/:transactionIndex', (req, res) => {
  const { batchId, transactionIndex } = req.params;

  const batch = batches.find(b => b.id === batchId);

  if (!batch) {
    return res.status(404).json({ error: "Batch not found" });
  }

  const index = parseInt(transactionIndex);

  if (isNaN(index) || index < 0 || index >= batch.transactions.length) {
    return res.status(400).json({ error: "Invalid transaction index" });
  }

  // Get the Merkle proof for the transaction
  const merkleProof = batch.merkleTree.getProof(index);

  // In a real implementation, the fraud proof would be computed based on an invalid state transition
  const fraudProof = ethers.utils.id("fraud proof");

  res.json({
    fraudProof,
    merkleProof,
  });
});

// Get gas prices from blockchain
app.get('/api/gas-prices', async (req, res) => {
  try {
    if (!isConnected || !provider) {
      return res.json({
        slow: "20",
        standard: "25",
        fast: "30",
        rapid: "35",
      });
    }

    const feeData = await provider.getFeeData();
    const gasPriceGwei = Math.round(Number(ethers.utils.formatUnits(feeData.gasPrice, "gwei")));

    res.json({
      slow: (gasPriceGwei * 0.8).toFixed(0),
      standard: gasPriceGwei.toFixed(0),
      fast: (gasPriceGwei * 1.2).toFixed(0),
      rapid: (gasPriceGwei * 1.5).toFixed(0),
    });
  } catch (error) {
    console.error('Error fetching gas prices:', error);
    res.json({
      slow: "20",
      standard: "25",
      fast: "30",
      rapid: "35",
    });
  }
});

// Check user balance
app.get('/api/balance/:address', async (req, res) => {
  const { address } = req.params;

  try {
    if (!isConnected || !provider || !contract) {
      return res.json({
        ethBalance: "1.5",
        l2Balance: "0.5",
      });
    }

    const ethBalance = await provider.getBalance(address);
    const l2Balance = await contract.balances(address);

    res.json({
      ethBalance: ethers.utils.formatEther(ethBalance),
      l2Balance: ethers.utils.formatEther(l2Balance),
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.json({
      ethBalance: "1.5",
      l2Balance: "0.5",
    });
  }
});

// Get pending transactions
app.get('/api/transactions/pending', async (req, res) => {
  try {
    // Filter transactions with "pending" status
    const pendingTxs = transactions.filter(tx => tx.status === "pending");

    if (pendingTxs.length > 0) {
      return res.json(pendingTxs);
    } else {
      // Return empty array if no pending transactions
      return res.json([]);
    }
  } catch (error) {
    console.error('Error fetching pending transactions:', error);
    return res.status(500).json({ error: 'Failed to fetch pending transactions' });
  }
});

// Balance update endpoint - moved to root level
app.post('/api/balance/update', async (req, res) => {
  try {
    const { userAddress, contractAddress, balance } = req.body;

    if (!userAddress || !contractAddress || !balance) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // First, check if we have an active contract deployment
    let deployment = await prisma.contractDeployment.findFirst({
      where: {
        address: contractAddress,
        isActive: true
      }
    });

    // If no deployment exists, create one
    if (!deployment) {
      deployment = await prisma.contractDeployment.create({
        data: {
          address: contractAddress,
          network: NETWORK,
          isActive: true
        }
      });
    }

    // Update or create the balance record
    const updatedBalance = await prisma.layer2Balance.upsert({
      where: {
        userAddress_contractAddress: {
          userAddress,
          contractAddress
        }
      },
      create: {
        userAddress,
        contractAddress,
        balance
      },
      update: {
        balance
      }
    });

    return res.status(200).json(updatedBalance);
  } catch (error) {
    console.error('Error updating balance:', error);
    return res.status(500).json({ error: 'Failed to update balance' });
  }
});

// Get balance endpoint
app.get('/api/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    const latestDeployment = await prisma.contractDeployment.findFirst({
      where: { isActive: true },
      include: {
        balances: {
          where: { userAddress: address }
        }
      },
      orderBy: { deployedAt: 'desc' }
    });

    if (!latestDeployment?.balances[0]) {
      return res.status(200).json({ balance: '0' });
    }

    return res.status(200).json({ balance: latestDeployment.balances[0].balance });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// Mock data generators for fallback
const getMockBatches = () => {
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

const getMockTransactionStatus = (address) => {
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (isConnected) {
    console.log(`Connected to blockchain via ${NETWORK === 'sepolia' ? 'Alchemy (Sepolia)' : 'local Hardhat node'}`);
  } else {
    console.log(`Running with mock data (blockchain connection not established)`);
    if (NETWORK === 'sepolia') {
      console.log(`Check your .env file to ensure ALCHEMY_API_KEY and PRIVATE_KEY are set correctly`);
    } else {
      console.log(`Check your local Hardhat node is running`);
    }
  }
});
