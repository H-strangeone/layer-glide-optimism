
require("@nomicfoundation/hardhat-toolbox");

// We'll use environment variables for API keys and private keys
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
