const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
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

// Get contract address from .env
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

// Network configuration
const NETWORK = process.env.NETWORK || 'localhost'; // 'localhost' or 'sepolia'

// Get Alchemy API key from .env
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

// Connect to the Ethereum network (Sepolia) via Alchemy
let provider;
let contract;

// Initialize provider and contract
const initBlockchainConnection = async () => {
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

      // For local development, try to connect to the Hardhat node
      try {
        provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");

        // Check if the node is running by getting the network
        const network = await provider.getNetwork();
        console.log(`Connected to local network: ${network.name} (chainId: ${network.chainId})`);

        // Use the default Hardhat private key for local development
        const privateKey = process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
        const wallet = new ethers.Wallet(privateKey, provider);
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

        console.log(`Connected to local network`);

        // For local development, we'll use the database to track state
        // This ensures persistence even when the node restarts
        console.log('Using database for state persistence in local development');
      } catch (error) {
        console.error('Failed to connect to local Hardhat node:', error);
        console.log('Continuing with database-only mode for local development');
        // We'll continue without a blockchain connection in local mode
        // This allows the app to work with just the database
      }
    }

    console.log(`Contract address: ${CONTRACT_ADDRESS}`);
    return true;
  } catch (error) {
    console.error('Error initializing blockchain connection:', error);
    return false;
  }
};

// Initialize blockchain connection
let isConnected = false;

// Initialize blockchain connection asynchronously
const initializeBlockchain = async () => {
  isConnected = await initBlockchainConnection();
  console.log(`Blockchain connection status: ${isConnected ? 'Connected' : 'Not connected'}`);
};

// Start the initialization
initializeBlockchain().catch(err => {
  console.error('Failed to initialize blockchain connection:', err);
});

// Admin authentication middleware
const adminAuth = async (req, res, next) => {
  try {
    const userAddress = req.headers['x-admin-address'];
    if (!userAddress) {
      return res.status(401).json({ success: false, message: 'Admin authentication required' });
    }

    console.log('Authenticating admin request from:', userAddress);

    // Check admin status from the contract
    try {
      let adminAddress;
      let isOperator = false;

      if (contract) {
        // Try admin() first
        try {
          console.log('Calling admin() function...');
          adminAddress = await contract.admin();
          console.log('Admin address from contract:', adminAddress);
        } catch (adminError) {
          console.log('admin() function failed, trying owner()');
          try {
            // Fallback to owner() if admin() fails
            console.log('Calling owner() function...');
            adminAddress = await contract.owner();
            console.log('Owner address from contract:', adminAddress);
          } catch (ownerError) {
            console.error('Both admin() and owner() failed:', ownerError);
            // If both fail, use hardcoded admin address for development
            adminAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
            console.log('Using hardcoded admin address:', adminAddress);
          }
        }

        // Try to check operator status
        try {
          console.log('Checking operator status...');
          isOperator = await contract.isOperator(userAddress);
          console.log('Is operator:', isOperator);
        } catch (operatorError) {
          console.log('isOperator check failed:', operatorError);
          // Continue without operator status
        }
      } else {
        // If contract is not initialized, use hardcoded admin address
        adminAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
        console.log('Contract not initialized, using hardcoded admin address:', adminAddress);
      }

      const isAdmin = userAddress.toLowerCase() === adminAddress.toLowerCase() || isOperator;
      console.log('Final admin status:', isAdmin);

      if (!isAdmin) {
        return res.status(403).json({ success: false, message: 'Unauthorized: Admin privileges required' });
      }

      next();
    } catch (error) {
      console.error('Error checking admin status:', error);
      // For development, allow hardcoded admin address as fallback
      const hardcodedAdmin = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const isAdmin = userAddress.toLowerCase() === hardcodedAdmin.toLowerCase();

      if (!isAdmin) {
        return res.status(403).json({ success: false, message: 'Unauthorized: Admin privileges required' });
      }

      next();
    }
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ success: false, message: 'Authentication error' });
  }
};

// API Routes

// Get all batches
app.get('/api/batches', async (req, res) => {
  try {
    // Get batches from database with their transactions
    const batches = await prisma.batch.findMany({
      include: {
        transactions: true
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    res.json(batches);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

// Store batch in database
app.post('/api/batches', async (req, res) => {
  try {
    const { batchId, transactionsRoot, timestamp, transactions } = req.body;

    if (!batchId || !transactionsRoot || !timestamp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`Storing batch ${batchId} in database`);

    // Store batch in database
    const batch = await prisma.batch.upsert({
      where: { batchId },
      update: {
        transactionsRoot,
        timestamp: new Date(Number(timestamp) * 1000),
        verified: false,
        finalized: false
      },
      create: {
        batchId,
        transactionsRoot,
        timestamp: new Date(Number(timestamp) * 1000),
        verified: false,
        finalized: false
      }
    });

    // Store transactions if provided
    if (transactions && Array.isArray(transactions) && transactions.length > 0) {
      for (const tx of transactions) {
        const txId = `${batch.id}-${tx.from}-${tx.to}-${tx.value}`;
        await prisma.batchTransaction.upsert({
          where: {
            id: txId
          },
          update: {
            status: tx.status || 'pending',
            timestamp: new Date(Number(tx.timestamp) * 1000)
          },
          create: {
            id: txId,
            from: tx.from,
            to: tx.to,
            value: tx.value.toString(), // Ensure value is stored as string
            status: tx.status || 'pending',
            timestamp: new Date(Number(tx.timestamp) * 1000),
            batchId: batch.id
          }
        });
      }
    }

    // Submit batch to blockchain if connected
    if (isConnected && contract) {
      try {
        const tx = await contract.submitBatch([transactionsRoot]);
        const receipt = await tx.wait();
        console.log(`Batch submitted to blockchain. Transaction hash: ${receipt.transactionHash}`);
      } catch (error) {
        console.error('Error submitting batch to blockchain:', error);
        // Don't throw error here, as the batch is still stored in database
      }
    }

    return res.status(201).json(batch);
  } catch (error) {
    console.error('Error storing batch in database:', error);
    return res.status(500).json({ error: 'Failed to store batch in database', details: error.message });
  }
});

// Update batch status
app.put('/api/batches', async (req, res) => {
  try {
    const { batchId, verified, finalized } = req.body;

    if (!batchId) {
      return res.status(400).json({ error: 'Missing batchId' });
    }

    // Update batch status in database
    const batch = await prisma.batch.update({
      where: { batchId },
      data: {
        verified: verified !== undefined ? verified : undefined,
        finalized: finalized !== undefined ? finalized : undefined
      }
    });

    return res.status(200).json(batch);
  } catch (error) {
    console.error('Error updating batch status:', error);
    return res.status(500).json({ error: 'Failed to update batch status' });
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

// Submit batch transactions
app.post('/api/transactions', async (req, res) => {
  try {
    const { transactions } = req.body;
    console.log('Received transactions:', JSON.stringify(transactions, null, 2));

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'Invalid transactions data' });
    }

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (prisma) => {
      // Generate a unique batch ID
      const batchId = uuidv4();

      // Create the batch first with a temporary transactions root
      const batch = await prisma.batch.create({
        data: {
          batchId,
          transactionsRoot: '0x0000000000000000000000000000000000000000000000000000000000000000', // Temporary
          timestamp: new Date(),
          verified: false,
          finalized: false
        }
      });

      // Then create the batch transactions
      const batchTransactions = await Promise.all(
        transactions.map(tx =>
          prisma.batchTransaction.create({
            data: {
              from: tx.from.toLowerCase(),
              to: tx.to.toLowerCase(),
              value: tx.amount.toString(),
              status: 'pending',
              timestamp: new Date(tx.timestamp * 1000),
              batchId: batch.id // Link to the batch using the batch's ID
            }
          })
        )
      );

      // Calculate merkle root from the saved transactions
      const transactionsRoot = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['address[]', 'address[]', 'uint256[]'],
          [
            batchTransactions.map(tx => tx.from),
            batchTransactions.map(tx => tx.to),
            batchTransactions.map(tx => ethers.utils.parseEther(tx.value))
          ]
        )
      );

      // Update the batch with the correct transactions root
      const updatedBatch = await prisma.batch.update({
        where: { id: batch.id },
        data: { transactionsRoot },
        include: { transactions: true }
      });

      return { batch: updatedBatch, transactions: batchTransactions, transactionsRoot };
    });

    const { batch, transactions: savedTransactions, transactionsRoot } = result;
    console.log('Created batch:', JSON.stringify(batch, null, 2));

    // Submit batch to the contract if connected
    if (isConnected && contract) {
      try {
        const tx = await contract.submitBatch([transactionsRoot]);
        const receipt = await tx.wait();
        console.log(`Batch submitted to blockchain. Transaction hash: ${receipt.transactionHash}`);
      } catch (error) {
        console.error('Error submitting batch to blockchain:', error);
        // Continue even if blockchain submission fails - we still have the batch in the database
      }
    } else {
      console.log('Blockchain not connected. Batch saved to database only.');
    }

    res.status(201).json({
      batchId: batch.batchId,
      transactions: savedTransactions,
      transactionsRoot
    });
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({
      error: "Failed to create batch",
      details: error.message,
      code: error.code || "UNKNOWN_ERROR"
    });
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

// Get balance for an address
app.get('/api/balance/:address', async (req, res) => {
  const { address } = req.params;

  if (!address) {
    return res.status(400).json({ error: "Address is required" });
  }

  try {
    let layer1Balance = "0";
    let layer2Balance = "0";

    // Try to get balances from blockchain if connected
    if (isConnected && provider && contract) {
      try {
        // Get Ethereum balance
        const ethBalance = await provider.getBalance(address);
        layer1Balance = ethers.utils.formatEther(ethBalance);

        // Get Layer 2 balance from contract
        const l2Balance = await contract.balances(address);
        layer2Balance = ethers.utils.formatEther(l2Balance);

        console.log(`Fetched balances for ${address}: L1=${layer1Balance}, L2=${layer2Balance}`);
      } catch (error) {
        console.error('Error fetching balances from blockchain:', error);
        // Continue with database values if blockchain fetch fails
      }
    }

    // If blockchain values are 0 or we couldn't connect, try to get from database
    if (layer2Balance === "0") {
      try {
        // Get the active contract deployment
        const activeDeployment = await prisma.contractDeployment.findFirst({
          where: { isActive: true }
        });

        if (activeDeployment) {
          // Get Layer 2 balance from database
          const dbBalance = await prisma.layer2Balance.findUnique({
            where: {
              userAddress_contractAddress: {
                userAddress: address.toLowerCase(),
                contractAddress: activeDeployment.address
              }
            }
          });

          if (dbBalance) {
            layer2Balance = dbBalance.balance;
            console.log(`Using database balance for ${address}: ${layer2Balance}`);
          }
        }
      } catch (error) {
        console.error('Error fetching balance from database:', error);
      }
    }

    // Update or create the balance record in the database
    try {
      const activeDeployment = await prisma.contractDeployment.findFirst({
        where: { isActive: true }
      });

      if (activeDeployment) {
        await prisma.balance.upsert({
          where: { address: address.toLowerCase() },
          update: {
            layer1Balance,
            layer2Balance,
            lastUpdated: new Date()
          },
          create: {
            address: address.toLowerCase(),
            layer1Balance,
            layer2Balance,
            lastUpdated: new Date()
          }
        });
      }
    } catch (error) {
      console.error('Error updating balance in database:', error);
    }

    return res.json({
      layer1Balance,
      layer2Balance
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return res.status(500).json({ error: "Failed to fetch balance" });
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

// Verify batch endpoint
app.post('/api/batches/verify', adminAuth, async (req, res) => {
  try {
    const { batchId } = req.body;
    if (!batchId) {
      return res.status(400).json({ success: false, message: 'Batch ID is required' });
    }

    // Find the batch in the database
    const batch = await prisma.batch.findUnique({
      where: { batchId },
      include: { transactions: true }
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Update batch status
    await prisma.batch.update({
      where: { batchId },
      data: { verified: true }
    });

    // Update transaction statuses
    await prisma.transaction.updateMany({
      where: { batchId },
      data: { status: 'confirmed' }
    });

    // Update user balances
    for (const tx of batch.transactions) {
      // Deduct from sender
      await prisma.user.update({
        where: { address: tx.from },
        data: {
          balance: {
            decrement: tx.value
          }
        }
      });

      // Add to recipient
      await prisma.user.update({
        where: { address: tx.to },
        data: {
          balance: {
            increment: tx.value
          }
        }
      });
    }

    return res.json({ success: true, message: 'Batch verified successfully' });
  } catch (err) {
    console.error('Error verifying batch:', err);
    res.status(500).json({ success: false, message: 'Failed to verify batch' });
  }
});

// Reject batch endpoint
app.post('/api/batches/reject', adminAuth, async (req, res) => {
  try {
    const { batchId, reason } = req.body;
    if (!batchId) {
      return res.status(400).json({ success: false, message: 'Batch ID is required' });
    }

    // Find the batch in the database
    const batch = await prisma.batch.findUnique({
      where: { batchId },
      include: { transactions: true }
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Update batch status
    await prisma.batch.update({
      where: { batchId },
      data: {
        rejected: true,
        rejectionReason: reason || 'Rejected by admin'
      }
    });

    // Update transaction statuses
    await prisma.transaction.updateMany({
      where: { batchId },
      data: { status: 'rejected' }
    });

    return res.json({ success: true, message: 'Batch rejected successfully' });
  } catch (err) {
    console.error('Error rejecting batch:', err);
    res.status(500).json({ success: false, message: 'Failed to reject batch' });
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

// Get live transactions
app.get('/api/transactions/live', async (req, res) => {
  try {
    // Get recent transactions from the database
    const recentTransactions = await prisma.batchTransaction.findMany({
      orderBy: {
        timestamp: 'desc'
      },
      take: 20, // Limit to 20 most recent transactions
      include: {
        batch: true
      }
    });

    // Format transactions for the frontend
    const formattedTransactions = recentTransactions.map(tx => ({
      hash: tx.id, // Use the database ID as a hash if no blockchain hash is available
      from: tx.from,
      to: tx.to,
      value: tx.value,
      status: tx.status,
      timestamp: Math.floor(new Date(tx.timestamp).getTime() / 1000),
      batchId: tx.batch?.batchId
    }));

    return res.json(formattedTransactions);
  } catch (error) {
    console.error('Error fetching live transactions:', error);
    return res.status(500).json({ error: "Failed to fetch live transactions" });
  }
});

// Get all network transactions
app.get('/api/transactions/network', async (req, res) => {
  try {
    // Get all transactions from the database, ordered by timestamp
    const transactions = await prisma.batchTransaction.findMany({
      orderBy: {
        timestamp: 'desc'
      },
      include: {
        batch: true // Include the associated batch information
      },
      take: 50 // Limit to 50 most recent transactions
    });

    // Format transactions for the frontend
    const formattedTransactions = transactions.map(tx => ({
      hash: tx.id,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      status: tx.batch?.verified ? 'verified' : tx.batch?.finalized ? 'finalized' : 'pending',
      timestamp: Math.floor(new Date(tx.timestamp).getTime() / 1000),
      batchId: tx.batch?.batchId || null,
      type: tx.type || 'transfer',
      isInBatch: !!tx.batch
    }));

    res.json(formattedTransactions);
  } catch (error) {
    console.error('Error fetching network transactions:', error);
    res.status(500).json({ error: 'Failed to fetch network transactions' });
  }
});

// Get user transaction history
app.get('/api/transactions/user/:address', async (req, res) => {
  const { address } = req.params;

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    // Get transactions where the address is either the sender or receiver
    const transactions = await prisma.batchTransaction.findMany({
      where: {
        OR: [
          { from: address.toLowerCase() },
          { to: address.toLowerCase() }
        ]
      },
      include: {
        batch: true
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 20
    });

    // Format transactions for the frontend
    const formattedTransactions = transactions.map(tx => ({
      hash: tx.id,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      status: tx.batch?.verified ? 'verified' : tx.batch?.finalized ? 'finalized' : 'pending',
      timestamp: Math.floor(new Date(tx.timestamp).getTime() / 1000),
      batchId: tx.batch?.batchId || null,
      type: tx.type || 'transfer',
      isInBatch: !!tx.batch
    }));

    res.json(formattedTransactions);
  } catch (error) {
    console.error('Error fetching user transaction history:', error);
    res.status(500).json({ error: 'Failed to fetch user transaction history' });
  }
});

// Admin check endpoint
app.get('/api/admin/check', async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) {
      return res.status(400).json({ success: false, message: 'Address is required' });
    }

    // Check if contract is initialized
    if (!contract) {
      console.error('Contract not initialized');
      return res.status(500).json({ success: false, message: 'Contract not initialized' });
    }

    console.log('Checking admin status for address:', address);

    try {
      let adminAddress;
      let isOperator = false;

      // Try admin() first
      try {
        console.log('Calling admin() function...');
        adminAddress = await contract.admin();
        console.log('Admin address from contract:', adminAddress);
      } catch (adminError) {
        console.log('admin() function failed, trying owner()');
        try {
          // Fallback to owner() if admin() fails
          console.log('Calling owner() function...');
          adminAddress = await contract.owner();
          console.log('Owner address from contract:', adminAddress);
        } catch (ownerError) {
          console.error('Both admin() and owner() failed:', ownerError);
          // If both fail, check against hardcoded admin address for development
          const hardcodedAdmin = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
          console.log('Using hardcoded admin address:', hardcodedAdmin);
          adminAddress = hardcodedAdmin;
        }
      }

      // Try to check operator status
      try {
        console.log('Checking operator status...');
        isOperator = await contract.isOperator(address);
        console.log('Is operator:', isOperator);
      } catch (operatorError) {
        console.log('isOperator check failed:', operatorError);
        // Continue without operator status
      }

      const isAdmin = address.toLowerCase() === adminAddress.toLowerCase() || isOperator;
      console.log('Final admin status:', isAdmin);

      res.json({
        success: true,
        isAdmin,
        adminAddress: isAdmin ? adminAddress : null
      });
    } catch (error) {
      console.error('Error checking admin status from contract:', error);
      // For development, allow hardcoded admin address
      const hardcodedAdmin = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const isAdmin = address.toLowerCase() === hardcodedAdmin.toLowerCase();
      res.json({
        success: true,
        isAdmin,
        adminAddress: isAdmin ? hardcodedAdmin : null
      });
    }
  } catch (error) {
    console.error('Error in admin check:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get operators
app.get('/api/operators', async (req, res) => {
  try {
    let operators = [];

    // Try to get operators from database
    try {
      operators = await prisma.operator.findMany({
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (dbError) {
      console.warn('Database error:', dbError);
      // Fallback to hardcoded operators for development
      operators = [
        { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', isActive: true },
        { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', isActive: true },
        { address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', isActive: true }
      ];
    }

    // Try to verify operator status on-chain
    if (contract) {
      operators = await Promise.all(operators.map(async (operator) => {
        try {
          const isActive = await contract.isOperator(operator.address);
          return { ...operator, isActive };
        } catch (err) {
          console.warn(`Failed to verify operator status for ${operator.address}:`, err);
          return operator;
        }
      }));
    }

    res.json(operators);
  } catch (error) {
    console.error('Error in /api/operators:', error);
    res.status(500).json({ error: 'Failed to fetch operators' });
  }
});

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
