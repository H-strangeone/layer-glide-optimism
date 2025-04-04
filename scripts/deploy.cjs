// import hardhat from "hardhat";

// const { ethers, network } = hardhat;

// async function main() {
//   console.log("------------------------------------------------------------------------");
//   console.log("Deploying Layer2Scaling contract to", network.name, "network...");

//   // Deploy the contract
//   const Layer2Scaling = await ethers.getContractFactory("Layer2Scaling");
//   const layer2Scaling = await Layer2Scaling.deploy();

//   await layer2Scaling.deployed();

//   console.log(`Layer2Scaling deployed to: ${layer2Scaling.address}`);
//   console.log("");
//   console.log("IMPORTANT: Update the CONTRACT_ADDRESS in src/lib/ethers.ts with:");
//   console.log(`  ${network.name}: "${layer2Scaling.address}",`);
//   console.log("------------------------------------------------------------------------");
// }

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
// const hre = require("hardhat");

// async function main() {
//   console.log("------------------------------------------------------------------------");
//   console.log("Deploying Layer2Scaling contract to", hre.network.name, "network...");

//   // Deploy the contract
//   const Layer2Scaling = await hre.ethers.getContractFactory("Layer2Scaling");
//   const layer2Scaling = await Layer2Scaling.deploy();

//   await layer2Scaling.waitForDeployment();


//   console.log(`Layer2Scaling deployed to: ${layer2Scaling.address}`);
//   console.log("");
//   console.log("IMPORTANT: Update the CONTRACT_ADDRESS in src/lib/ethers.ts with:");
//   console.log(`  ${hre.network.name}: "${layer2Scaling.address}",`);
//   console.log("------------------------------------------------------------------------");
// }

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
const hre = require("hardhat");

async function main() {
  console.log("------------------------------------------------------------------------");
  console.log("Deploying Layer2Scaling contract to", hre.network.name, "network...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy the contract
  const Layer2Scaling = await hre.ethers.getContractFactory("Layer2Scaling");
  const layer2Scaling = await Layer2Scaling.deploy();

  await layer2Scaling.waitForDeployment();

  const contractAddress = await layer2Scaling.getAddress();
  console.log(`Layer2Scaling deployed to: ${contractAddress}`);

  console.log("");
  console.log("IMPORTANT: Update these files with the new contract address:");
  console.log("1. .env file:");
  console.log(`   CONTRACT_ADDRESS="${contractAddress}"`);
  console.log(`   VITE_CONTRACT_ADDRESS="${contractAddress}"`);
  console.log("2. src/lib/ethers.ts:");
  console.log(`   ${hre.network.name}: "${contractAddress}",`);
  console.log("------------------------------------------------------------------------");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
