
require("@nomicfoundation/hardhat-toolbox");

// Get environment variables for API keys and private keys
// If running on local machine, you need to:
// 1. Create a .env file in the project root
// 2. Add ALCHEMY_API_KEY and PRIVATE_KEY to it
// 3. Install dotenv: npm install dotenv
require('dotenv').config();

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "your_alchemy_api_key";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "your_private_key";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      chainId: 1337,
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [PRIVATE_KEY],
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
};
