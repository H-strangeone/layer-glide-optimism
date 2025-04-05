# Layer 2 Optimistic Rollup

This project implements a Layer 2 scaling solution using Optimistic Rollups on Ethereum. It includes a frontend interface, backend server, and smart contract for managing off-chain transactions.

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- npm or yarn
- MetaMask browser extension
- Alchemy API key (get one from [Alchemy](https://www.alchemy.com/))
- Ethereum wallet with private key

### Environment Setup

1. Create a `.env` file in the project root (copy from `.env.example`):
   ```
   # Alchemy API key - Get it from https://www.alchemy.com/
   ALCHEMY_API_KEY=your_alchemy_api_key_here

   # Your wallet's private key (NEVER share this or commit to git)
   PRIVATE_KEY=your_wallet_private_key_here

   # Contract address
   CONTRACT_ADDRESS=0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
   VITE_CONTRACT_ADDRESS=0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
   ```

2. Replace `your_alchemy_api_key_here` with your actual Alchemy API key.
3. Replace `your_wallet_private_key_here` with your wallet's private key (from MetaMask or other wallet).

### Smart Contract Deployment

1. Install dependencies:
   ```
   npm install
   ```

2. Deploy to Sepolia testnet:
   ```
   npx hardhat run scripts/deploy.js --network sepolia
   ```

3. The deployment script will output the contract address. Update this address in:
   - `.env` file (both CONTRACT_ADDRESS and VITE_CONTRACT_ADDRESS)
   - `src/config/contract.ts`

### Running the Frontend

1. Start the development server:
   ```
   npm run dev
   ```

2. Open your browser and connect MetaMask to the Sepolia network.

## Features

- Wallet integration with MetaMask
- Batch transaction submission
- State verification and fraud proof mechanism
- Balance management and withdrawal capabilities
- Merkle tree implementation for state management
- Optimistic rollup architecture

## Tech Stack

- React, TypeScript, Tailwind CSS
- Ethers.js for blockchain interaction
- Hardhat for contract deployment
- Solidity for smart contracts

## License

MIT
