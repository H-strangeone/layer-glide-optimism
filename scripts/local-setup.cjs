const hre = require("hardhat");

async function main() {
    console.log("Setting up local development environment...");

    // Get test accounts
    const [admin, operator] = await hre.ethers.getSigners();

    console.log("\nTest Accounts:");
    console.log("==============");
    console.log(`Admin Account: ${admin.address}`);
    console.log(`Admin Balance: ${await hre.ethers.formatEther(await admin.getBalance())} ETH`);
    console.log(`Operator Account: ${operator.address}`);
    console.log(`Operator Balance: ${await hre.ethers.formatEther(await operator.getBalance())} ETH`);

    // Deploy the contract
    console.log("\nDeploying Layer2Scaling contract...");
    const Layer2Scaling = await hre.ethers.getContractFactory("Layer2Scaling");
    const layer2Scaling = await Layer2Scaling.deploy();
    await layer2Scaling.waitForDeployment();

    const contractAddress = await layer2Scaling.getAddress();
    console.log(`Contract deployed to: ${contractAddress}`);

    // Add operator
    console.log("\nSetting up roles...");
    await layer2Scaling.addOperator(operator.address);
    console.log(`Added ${operator.address} as operator`);

    // Verify roles
    const isOperator = await layer2Scaling.isOperator(operator.address);
    const adminAddress = await layer2Scaling.admin();

    console.log("\nRole Verification:");
    console.log("=================");
    console.log(`Admin: ${adminAddress}`);
    console.log(`Is ${operator.address} operator? ${isOperator}`);

    console.log("\nSetup complete! You can now:");
    console.log("1. Connect MetaMask to http://127.0.0.1:8545 (Chain ID: 1337)");
    console.log("2. Import the test accounts using their private keys:");
    console.log("   Admin: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
    console.log("   Operator: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
    console.log(`3. Update CONTRACT_ADDRESS in your .env to: ${contractAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 