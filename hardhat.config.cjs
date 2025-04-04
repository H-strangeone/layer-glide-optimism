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
  solidity: "0.8.20",
  networks: {
    hardhat: {
      accounts: [
        {
          privateKey: "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
          balance: "10000000000000000000000" // 10000 ETH
        },
        {
          privateKey: "59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
          balance: "10000000000000000000000"
        },
        {
          privateKey: "5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
          balance: "10000000000000000000000"
        },
        {
          privateKey: "7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
          balance: "10000000000000000000000"
        },
        {
          privateKey: "47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
          balance: "10000000000000000000000"
        }
      ],
      chainId: 1337
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
      accounts: [process.env.PRIVATE_KEY || ""]
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      chainId: 11155111,
      accounts: [process.env.PRIVATE_KEY || ""]
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};
