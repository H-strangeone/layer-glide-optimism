
# Layer 2 Optimistic Rollup

This project implements a Layer 2 scaling solution using Optimistic Rollups on Ethereum. It includes a frontend interface, backend server, and smart contract for managing off-chain transactions.

## Features

- Wallet integration with MetaMask
- Batch transaction submission
- State verification and fraud proof mechanism
- Balance management and withdrawal capabilities
- Merkle tree implementation for state management
- Optimistic rollup architecture

## Tech Stack

### Frontend
- Vite
- React
- TypeScript
- Tailwind CSS
- Ethers.js
- React Router

### Backend
- Node.js
- Express
- Ethers.js

### Blockchain
- Hardhat
- Solidity
- Alchemy API

## Project Structure

- `/src` - Frontend React application
- `/backend` - Node.js backend API
- `/contracts` - Solidity smart contracts
- `/scripts` - Hardhat deployment scripts

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- npm or yarn
- MetaMask browser extension
- Alchemy API key

### Smart Contract Deployment

1. Install dependencies:
   ```
   npm install
   ```

2. Update your Alchemy API key and private key in `hardhat.config.js`:
   ```js
   const ALCHEMY_API_KEY = "your_alchemy_api_key";
   const PRIVATE_KEY = "your_private_key";
   ```

3. Deploy to Sepolia testnet:
   ```
   npx hardhat run scripts/deploy.js --network sepolia
   ```

4. Update the contract address in:
   - `src/lib/ethers.ts`
   - `backend/server.js`

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Update your Alchemy API key in `server.js`:
   ```js
   const ALCHEMY_API_KEY = "your_alchemy_api_key";
   ```

4. Start the backend server:
   ```
   npm start
   ```

The backend will run on http://localhost:5500.

### Frontend Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

The frontend will run on http://localhost:5173.

## Usage

1. Connect your MetaMask wallet to the application.
2. Switch to the Sepolia testnet.
3. Deposit funds to Layer 2.
4. Create batch transactions.
5. Monitor transaction status.
6. Withdraw funds when needed.

## Architecture

### Optimistic Rollup Implementation

This project implements an Optimistic Rollup with the following components:

1. **Off-chain Execution**:
   - Transactions are processed off-chain by the backend.
   - Transaction data is organized into batches.

2. **State Management**:
   - Merkle trees are used to efficiently verify transaction inclusion.
   - State transitions are computed off-chain.

3. **Fraud Proofs**:
   - Anyone can challenge invalid state transitions during the challenge period.
   - If a fraud proof is valid, the batch is rejected.

4. **Data Availability**:
   - Transaction data is made available via the backend API.
   - This ensures the system remains trustless.

5. **Finality**:
   - After the challenge period (7 days), batches are finalized.
   - State transitions become permanent on the Ethereum mainnet.

## License

MIT
