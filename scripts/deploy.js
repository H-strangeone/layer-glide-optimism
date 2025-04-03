
const hre = require("hardhat");

async function main() {
  console.log("Deploying Layer2Scaling contract...");

  // Deploy the contract
  const Layer2Scaling = await hre.ethers.getContractFactory("Layer2Scaling");
  const layer2Scaling = await Layer2Scaling.deploy();

  await layer2Scaling.deployed();

  console.log(`Layer2Scaling deployed to: ${layer2Scaling.address}`);
  console.log("Update the CONTRACT_ADDRESS in backend/server.js and src/lib/ethers.ts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
