import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import MerkleTree from './merkleTree.js';
import * as rollup from './rollup.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const app = express();
const PORT = 5500;

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
    const batches = await prisma.batch.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        transactions: true
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
    const { batchId, transactionsRoot, transactions } = req.body;

    if (!batchId || !transactionsRoot) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`Storing batch ${batchId} in database`);

    // Store batch in database
    const batch = await prisma.batch.upsert({
      where: { batchId },
      update: {
        transactionsRoot,
        verified: false,
        finalized: false
      },
      create: {
        batchId,
        transactionsRoot,
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
            status: tx.status || 'pending'
          },
          create: {
            id: txId,
            from: tx.from,
            to: tx.to,
            value: tx.value.toString(), // Ensure value is stored as string
            status: tx.status || 'pending',
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
      }
    }

    res.json(batch);
  } catch (error) {
    console.error('Error storing batch:', error);
    res.status(500).json({ error: 'Failed to store batch' });
  }
});

// Verify a batch
app.post('/api/batches/verify', adminAuth, async (req, res) => {
  try {
    const { batchId } = req.body;
    if (!batchId) {
      return res.status(400).json({ error: 'Batch ID is required' });
    }

    // Find the batch in the database
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { transactions: true }
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Get the active contract deployment
    const activeDeployment = await prisma.contractDeployment.findFirst({
      where: { isActive: true }
    });

    if (!activeDeployment) {
      return res.status(404).json({ error: 'No active contract deployment found' });
    }

    // Update batch status to verified
    const updatedBatch = await prisma.batch.update({
      where: { id: batchId },
      data: {
        verified: true,
        finalized: false,
        rejected: false
      },
      include: { transactions: true }
    });

    // Update transaction statuses to verified
    await prisma.batchTransaction.updateMany({
      where: { batchId: batch.id },
      data: { status: 'verified' }
    });

    // Update L2 balances for each transaction
    for (const tx of batch.transactions) {
      // Update sender's balance
      const senderBalance = await prisma.layer2Balance.findUnique({
        where: {
          userAddress_contractAddress: {
            userAddress: tx.from.toLowerCase(),
            contractAddress: activeDeployment.address
          }
        }
      });

      if (senderBalance) {
        const newSenderBalance = (BigInt(senderBalance.balance) - BigInt(tx.value)).toString();
        await prisma.layer2Balance.update({
          where: {
            userAddress_contractAddress: {
              userAddress: tx.from.toLowerCase(),
              contractAddress: activeDeployment.address
            }
          },
          data: { balance: newSenderBalance }
        });
      }

      // Update recipient's balance
      const recipientBalance = await prisma.layer2Balance.findUnique({
        where: {
          userAddress_contractAddress: {
            userAddress: tx.to.toLowerCase(),
            contractAddress: activeDeployment.address
          }
        }
      });

      if (recipientBalance) {
        const newRecipientBalance = (BigInt(recipientBalance.balance) + BigInt(tx.value)).toString();
        await prisma.layer2Balance.update({
          where: {
            userAddress_contractAddress: {
              userAddress: tx.to.toLowerCase(),
              contractAddress: activeDeployment.address
            }
          },
          data: { balance: newRecipientBalance }
        });
      } else {
        // Create new balance record for recipient
        await prisma.layer2Balance.create({
          data: {
            userAddress: tx.to.toLowerCase(),
            contractAddress: activeDeployment.address,
            balance: tx.value
          }
        });
      }
    }

    return res.json({
      success: true,
      message: 'Batch verified successfully',
      batch: updatedBatch
    });
  } catch (error) {
    console.error('Error verifying batch:', error);
    return res.status(500).json({ error: 'Failed to verify batch' });
  }
});

// Reject a batch
app.post('/api/batches/reject', async (req, res) => {
  try {
    const { batchId } = req.body;
    if (!batchId) {
      return res.status(400).json({ error: 'Batch ID is required' });
    }

    // Find the batch in the database
    const batch = await prisma.batch.findUnique({
      where: { id: batchId }
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Update the batch status to rejected
    const updatedBatch = await prisma.$transaction(async (prisma) => {
      // First update the batch
      const batch = await prisma.batch.update({
        where: { id: batchId },
        data: {
          verified: false,
          finalized: false,
          rejected: true
        }
      });

      // Then update all associated transactions
      await prisma.batchTransaction.updateMany({
        where: {
          batch: {
            id: batchId
          }
        },
        data: {
          status: 'rejected'
        }
      });

      return batch;
    });

    res.json({
      message: 'Batch rejected successfully',
      batch: updatedBatch
    });
  } catch (error) {
    console.error('Error rejecting batch:', error);
    res.status(500).json({ error: 'Failed to reject batch' });
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

      // Create the batch first
      const batch = await prisma.batch.create({
        data: {
          batchId: batchId,
          transactionsRoot: '0x0000000000000000000000000000000000000000000000000000000000000000', // Temporary
          verified: false,
          finalized: false,
          rejected: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log('Created batch:', batch);

      // Then create the batch transactions
      const batchTransactions = await Promise.all(
        transactions.map(tx =>
          prisma.batchTransaction.create({
            data: {
              from: tx.from.toLowerCase(),
              to: tx.to.toLowerCase(),
              value: tx.amount.toString(),
              status: 'pending',
              batchId: batch.id,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
        )
      );

      console.log('Created batch transactions:', batchTransactions);

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
    const pendingTransactions = await prisma.transaction.findMany({
      where: {
        status: 'pending'
      },
      orderBy: {
        timestamp: 'asc'
      },
      select: {
        id: true,
        sender: true,
        recipient: true,
        amount: true,
        status: true,
        timestamp: true
      }
    });

    const formattedTransactions = pendingTransactions.map(tx => ({
      ...tx,
      timestamp: tx.timestamp.toISOString()
    }));

    return res.status(200).json(formattedTransactions);
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

// Mock data generators for fallback
const getMockBatches = () => {
  return [
    {
      id: '1',
      batchId: '1',
      transactionsRoot: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      status: 'pending',
      timestamp: new Date().toISOString(),
      size: 5
    },
    {
      id: '2',
      batchId: '2',
      transactionsRoot: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      status: 'verified',
      timestamp: new Date().toISOString(),
      size: 3
    }
  ];
};

const getMockTransactionStatus = (address) => {
  return [
    {
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      from: address,
      to: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      value: '1000000000000000000',
      status: 'pending',
      timestamp: new Date().toISOString()
    },
    {
      hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      from: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      to: address,
      value: '500000000000000000',
      status: 'completed',
      timestamp: new Date().toISOString()
    }
  ];
};

// Get live transactions
app.get('/api/transactions/live', async (req, res) => {
  try {
    // Get recent transactions from the database
    const recentTransactions = await prisma.batchTransaction.findMany({
      orderBy: {
        createdAt: 'desc'
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
      createdAt: Math.floor(new Date(tx.createdAt).getTime() / 1000),
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
    // Get all transactions from the database, ordered by createdAt
    const transactions = await prisma.batchTransaction.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        batch: true
      }
    });

    // Format transactions for the frontend
    const formattedTransactions = transactions.map(tx => {
      try {
        return {
          hash: tx.id,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          status: tx.batch ? (tx.batch.verified ? 'verified' : tx.batch.finalized ? 'finalized' : tx.batch.rejected ? 'rejected' : 'pending') : 'pending',
          createdAt: Math.floor(new Date(tx.createdAt).getTime() / 1000),
          batchId: tx.batch?.batchId || null,
          type: tx.type || 'transfer',
          isInBatch: !!tx.batch
        };
      } catch (err) {
        console.error('Error formatting transaction:', err);
        return {
          hash: tx.id,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          status: 'pending',
          createdAt: Math.floor(new Date(tx.createdAt).getTime() / 1000),
          batchId: null,
          type: 'transfer',
          isInBatch: false
        };
      }
    });

    res.json(formattedTransactions);
  } catch (error) {
    console.error('Error fetching network transactions:', error);
    res.status(500).json({ error: 'Failed to fetch network transactions' });
  }
});

// Get user transaction history
app.get('/api/transactions/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    const transactions = await prisma.batchTransaction.findMany({
      where: {
        OR: [
          { from: address },
          { to: address }
        ]
      },
      include: {
        batch: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedTransactions = transactions.map(tx => {
      try {
        return {
          hash: tx.id,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          status: tx.batch ? (tx.batch.verified ? 'verified' : tx.batch.finalized ? 'finalized' : tx.batch.rejected ? 'rejected' : 'pending') : 'pending',
          createdAt: Math.floor(new Date(tx.createdAt).getTime() / 1000),
          batchId: tx.batch?.batchId || null,
          type: tx.type || 'transfer',
          isInBatch: !!tx.batch
        };
      } catch (err) {
        console.error('Error formatting transaction:', err);
        return {
          hash: tx.id,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          status: 'pending',
          createdAt: Math.floor(new Date(tx.createdAt).getTime() / 1000),
          batchId: null,
          type: 'transfer',
          isInBatch: false
        };
      }
    });

    res.json(formattedTransactions);
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    res.status(500).json({ error: 'Failed to fetch user transactions' });
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
    const operators = await prisma.operator.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(operators);
  } catch (error) {
    console.error('Error fetching operators:', error);
    res.status(500).json({ error: 'Failed to fetch operators' });
  }
});

// Update Layer 2 balances after batch verification
app.post('/api/batches/update-balances', adminAuth, async (req, res) => {
  try {
    const { batchId } = req.body;
    if (!batchId) {
      return res.status(400).json({ success: false, message: 'Batch ID is required' });
    }

    // Find the batch and its transactions
    const batch = await prisma.batch.findUnique({
      where: { batchId },
      include: { transactions: true }
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Get the active contract deployment
    const activeDeployment = await prisma.contractDeployment.findFirst({
      where: { isActive: true }
    });

    if (!activeDeployment) {
      return res.status(500).json({ error: 'No active contract deployment found' });
    }

    // Update balances for each transaction
    for (const tx of batch.transactions) {
      // Update sender's balance
      const senderBalance = await prisma.layer2Balance.findUnique({
        where: {
          userAddress_contractAddress: {
            userAddress: tx.from.toLowerCase(),
            contractAddress: activeDeployment.address
          }
        }
      });

      if (senderBalance) {
        const newSenderBalance = (BigInt(senderBalance.balance) - BigInt(tx.value)).toString();
        await prisma.layer2Balance.update({
          where: {
            userAddress_contractAddress: {
              userAddress: tx.from.toLowerCase(),
              contractAddress: activeDeployment.address
            }
          },
          data: { balance: newSenderBalance }
        });
      }

      // Update recipient's balance
      const recipientBalance = await prisma.layer2Balance.findUnique({
        where: {
          userAddress_contractAddress: {
            userAddress: tx.to.toLowerCase(),
            contractAddress: activeDeployment.address
          }
        }
      });

      if (recipientBalance) {
        const newRecipientBalance = (BigInt(recipientBalance.balance) + BigInt(tx.value)).toString();
        await prisma.layer2Balance.update({
          where: {
            userAddress_contractAddress: {
              userAddress: tx.to.toLowerCase(),
              contractAddress: activeDeployment.address
            }
          },
          data: { balance: newRecipientBalance }
        });
      } else {
        // Create new balance record for recipient
        await prisma.layer2Balance.create({
          data: {
            userAddress: tx.to.toLowerCase(),
            contractAddress: activeDeployment.address,
            balance: tx.value
          }
        });
      }
    }

    return res.json({ success: true, message: 'Balances updated successfully' });
  } catch (error) {
    console.error('Error updating balances:', error);
    return res.status(500).json({ error: 'Failed to update balances' });
  }
});

// Challenge a batch
app.post('/api/batches/challenge', async (req, res) => {
  try {
    const { batchId, challengerAddress } = req.body;
    if (!batchId || !challengerAddress) {
      return res.status(400).json({ error: 'Batch ID and challenger address are required' });
    }

    // Find the batch in the database
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { transactions: true }
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    if (!batch.verified || batch.finalized || batch.rejected) {
      return res.status(400).json({ error: 'Batch cannot be challenged in its current state' });
    }

    // Create a challenge record
    const challenge = await prisma.batchChallenge.create({
      data: {
        batchId: batch.id,
        challengerAddress: challengerAddress.toLowerCase(),
        status: 'pending',
        timestamp: new Date()
      }
    });

    res.json({
      message: 'Challenge submitted successfully',
      challenge
    });
  } catch (error) {
    console.error('Error submitting challenge:', error);
    res.status(500).json({ error: 'Failed to submit challenge' });
  }
});

// Verify a challenge
app.post('/api/batches/verify-challenge', adminAuth, async (req, res) => {
  try {
    const { batchId, isValid, adminAddress } = req.body;
    if (!batchId || typeof isValid !== 'boolean') {
      return res.status(400).json({ error: 'Batch ID and validity status are required' });
    }

    // Find the challenge
    const challenge = await prisma.batchChallenge.findFirst({
      where: {
        batchId,
        status: 'pending'
      },
      include: {
        batch: true
      }
    });

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const PENALTY_AMOUNT = '10000000000000000000'; // 10 ETH penalty

    if (isValid) {
      // Challenge is valid - penalize batch creator
      // Update batch creator's balances
      const batchCreator = await prisma.user.findFirst({
        where: { address: challenge.batch.creatorAddress }
      });

      if (batchCreator) {
        // Deduct from L2 balance first
        const l2Balance = BigInt(batchCreator.l2Balance || '0');
        const penalty = BigInt(PENALTY_AMOUNT);

        if (l2Balance >= penalty) {
          await prisma.user.update({
            where: { id: batchCreator.id },
            data: {
              l2Balance: (l2Balance - penalty).toString()
            }
          });
        } else {
          // If L2 balance is insufficient, deduct from L1 balance
          const l1Balance = BigInt(batchCreator.l1Balance || '0');
          await prisma.user.update({
            where: { id: batchCreator.id },
            data: {
              l2Balance: '0',
              l1Balance: (l1Balance - (penalty - l2Balance)).toString()
            }
          });
        }
      }

      // Update batch status
      await prisma.batch.update({
        where: { id: batchId },
        data: {
          rejected: true,
          verified: false,
          finalized: false
        }
      });
    } else {
      // Challenge is invalid - penalize challenger
      const challenger = await prisma.user.findFirst({
        where: { address: challenge.challengerAddress }
      });

      if (challenger) {
        const l2Balance = BigInt(challenger.l2Balance || '0');
        const penalty = BigInt(PENALTY_AMOUNT);

        if (l2Balance >= penalty) {
          await prisma.user.update({
            where: { id: challenger.id },
            data: {
              l2Balance: (l2Balance - penalty).toString()
            }
          });
        } else {
          const l1Balance = BigInt(challenger.l1Balance || '0');
          await prisma.user.update({
            where: { id: challenger.id },
            data: {
              l2Balance: '0',
              l1Balance: (l1Balance - (penalty - l2Balance)).toString()
            }
          });
        }
      }
    }

    // Update challenge status
    await prisma.batchChallenge.update({
      where: { id: challenge.id },
      data: {
        status: isValid ? 'accepted' : 'rejected',
        resolvedBy: adminAddress.toLowerCase(),
        resolvedAt: new Date()
      }
    });

    res.json({
      message: isValid ? 'Challenge verified as valid' : 'Challenge rejected',
      challenge
    });
  } catch (error) {
    console.error('Error verifying challenge:', error);
    res.status(500).json({ error: 'Failed to verify challenge' });
  }
});

// Rollup API endpoints
app.post('/api/rollup/batch/create', async (req, res) => {
  try {
    const result = await rollup.createBatch();
    res.json(result);
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ error: 'Failed to create batch' });
  }
});

app.post('/api/rollup/batch/verify', async (req, res) => {
  try {
    const { batchId } = req.body;
    if (!batchId) {
      return res.status(400).json({ error: 'Batch ID is required' });
    }

    const result = await rollup.verifyBatch(batchId);
    res.json(result);
  } catch (error) {
    console.error('Error verifying batch:', error);
    res.status(500).json({ error: 'Failed to verify batch' });
  }
});

app.post('/api/rollup/batch/finalize', async (req, res) => {
  try {
    const { batchId } = req.body;
    if (!batchId) {
      return res.status(400).json({ error: 'Batch ID is required' });
    }

    const result = await rollup.finalizeBatch(batchId);
    res.json(result);
  } catch (error) {
    console.error('Error finalizing batch:', error);
    res.status(500).json({ error: 'Failed to finalize batch' });
  }
});

app.post('/api/rollup/fraud-proof', async (req, res) => {
  try {
    const { batchId, challengerAddress, fraudProof } = req.body;
    if (!batchId || !challengerAddress || !fraudProof) {
      return res.status(400).json({ error: 'Batch ID, challenger address, and fraud proof are required' });
    }

    const result = await rollup.submitFraudProof(batchId, challengerAddress, fraudProof);
    res.json(result);
  } catch (error) {
    console.error('Error submitting fraud proof:', error);
    res.status(500).json({ error: 'Failed to submit fraud proof' });
  }
});

// Admin API endpoints
app.get('/api/admin/operators', async (req, res) => {
  try {
    // For now, return mock data
    const operators = [
      { id: '1', address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', isActive: true },
      { id: '2', address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', isActive: true }
    ];
    res.json(operators);
  } catch (error) {
    console.error('Error fetching operators:', error);
    res.status(500).json({ error: 'Failed to fetch operators' });
  }
});

app.post('/api/admin/operators', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    // In a real implementation, you would add the operator to the database
    // For now, just return success
    res.json({ success: true, message: 'Operator added successfully' });
  } catch (error) {
    console.error('Error adding operator:', error);
    res.status(500).json({ error: 'Failed to add operator' });
  }
});

app.delete('/api/admin/operators/:address', async (req, res) => {
  try {
    const { address } = req.params;
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    // In a real implementation, you would remove the operator from the database
    // For now, just return success
    res.json({ success: true, message: 'Operator removed successfully' });
  } catch (error) {
    console.error('Error removing operator:', error);
    res.status(500).json({ error: 'Failed to remove operator' });
  }
});

app.get('/api/admin/contracts', async (req, res) => {
  try {
    // For now, return mock data
    const contracts = [
      { id: '1', address: '0x5FbDB2315678afecb367f032d93F642f64180aa3', network: 'localhost', isActive: true }
    ];
    res.json(contracts);
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
});

app.post('/api/admin/contracts', async (req, res) => {
  try {
    const { address, network } = req.body;
    if (!address || !network) {
      return res.status(400).json({ error: 'Address and network are required' });
    }

    // In a real implementation, you would add the contract to the database
    // For now, just return success
    res.json({ success: true, message: 'Contract added successfully' });
  } catch (error) {
    console.error('Error adding contract:', error);
    res.status(500).json({ error: 'Failed to add contract' });
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
