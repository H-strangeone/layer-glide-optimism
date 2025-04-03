
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const MerkleTree = require('./merkleTree');
const app = express();
const PORT = 5500;

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
];

// Replace with your deployed contract address
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Alchemy API key for Sepolia (replace with your own)
const ALCHEMY_API_KEY = "your_alchemy_api_key";
const provider = new ethers.providers.JsonRpcProvider(`https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`);

// API Routes

// Get all batches
app.get('/api/batches', (req, res) => {
  res.json(batches);
});

// Get batch by ID
app.get('/api/batches/:id', (req, res) => {
  const batch = batches.find(b => b.id === req.params.id);
  
  if (!batch) {
    return res.status(404).json({ error: "Batch not found" });
  }
  
  res.json(batch);
});

// Submit transactions
app.post('/api/transactions', (req, res) => {
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
    hash: ethers.utils.randomBytes(32), // Mock hash
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
  
  // Submit batch to the contract (in a real implementation)
  // This would be done asynchronously
  
  res.status(201).json({ batchId: newBatch.id });
});

// Get transactions by address
app.get('/api/transactions', (req, res) => {
  const { address } = req.query;
  
  if (!address) {
    return res.status(400).json({ error: "Address is required" });
  }
  
  // Filter transactions by address
  const addressTransactions = transactions.filter(
    tx => tx.sender.toLowerCase() === address.toLowerCase() || 
          tx.recipient.toLowerCase() === address.toLowerCase()
  );
  
  res.json(addressTransactions);
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
  // For demo purposes, we just return a mock fraud proof
  const fraudProof = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("fraud proof"));
  
  res.json({
    fraudProof,
    merkleProof,
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
