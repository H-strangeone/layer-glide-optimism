const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("\n🚀 Starting Local Network Tests...\n");

    // 1. Get test accounts
    const [admin, operator, user1, user2] = await hre.ethers.getSigners();
    console.log("Test Accounts:");
    console.log("==============");
    console.log(`Admin: ${admin.address}`);
    console.log(`Operator: ${operator.address}`);
    console.log(`User1: ${user1.address}`);
    console.log(`User2: ${user2.address}`);

    // 2. Deploy contract
    console.log("\n📄 Deploying Layer2Scaling Contract...");
    const Layer2Scaling = await hre.ethers.getContractFactory("Layer2Scaling");
    const layer2Scaling = await Layer2Scaling.deploy();
    await layer2Scaling.waitForDeployment();
    const contractAddress = await layer2Scaling.getAddress();
    console.log(`Contract deployed to: ${contractAddress}`);

    // 3. Test Admin Features
    console.log("\n👑 Testing Admin Features...");
    console.log("-------------------------");

    // Add operator
    console.log("Adding operator...");
    await layer2Scaling.addOperator(operator.address);
    const isOperator = await layer2Scaling.isOperator(operator.address);
    console.log(`Operator status: ${isOperator}`);

    // 4. Test User Deposits
    console.log("\n💰 Testing User Deposits...");
    console.log("-------------------------");

    // User1 deposits 1 ETH
    const depositAmount = ethers.parseEther("1.0");
    console.log("User1 depositing 1 ETH...");
    await layer2Scaling.connect(user1).depositFunds({ value: depositAmount });
    let user1Balance = await layer2Scaling.balances(user1.address);
    console.log(`User1 L2 balance: ${ethers.formatEther(user1Balance)} ETH`);

    // User2 deposits 2 ETH
    const deposit2Amount = ethers.parseEther("2.0");
    console.log("User2 depositing 2 ETH...");
    await layer2Scaling.connect(user2).depositFunds({ value: deposit2Amount });
    let user2Balance = await layer2Scaling.balances(user2.address);
    console.log(`User2 L2 balance: ${ethers.formatEther(user2Balance)} ETH`);

    // 5. Test Batch Operations
    console.log("\n📦 Testing Batch Operations...");
    console.log("---------------------------");

    // Create a test batch
    const tx1Hash = ethers.keccak256(ethers.toUtf8Bytes("transaction1"));
    const tx2Hash = ethers.keccak256(ethers.toUtf8Bytes("transaction2"));
    console.log("Operator submitting batch...");
    await layer2Scaling.connect(operator).submitBatch([tx1Hash, tx2Hash]);

    // Get batch info
    const batchId = await layer2Scaling.nextBatchId();
    console.log(`Batch submitted, ID: ${Number(batchId) - 1}`);

    // Verify batch
    console.log("Admin verifying batch...");
    await layer2Scaling.verifyBatch(1);
    const batch = await layer2Scaling.batches(1);
    console.log(`Batch verified: ${batch.verified}`);

    // 6. Test Withdrawals
    console.log("\n💸 Testing Withdrawals...");
    console.log("------------------------");

    // User1 withdraws 0.5 ETH
    const withdrawAmount = ethers.parseEther("0.5");
    console.log("User1 withdrawing 0.5 ETH...");
    await layer2Scaling.connect(user1).withdrawFunds(withdrawAmount);
    user1Balance = await layer2Scaling.balances(user1.address);
    console.log(`User1 L2 balance after withdrawal: ${ethers.formatEther(user1Balance)} ETH`);

    // 7. Test Error Cases
    console.log("\n❌ Testing Error Cases...");
    console.log("----------------------");

    try {
        console.log("Testing withdrawal with insufficient funds...");
        const largeAmount = ethers.parseEther("1000.0");
        await layer2Scaling.connect(user2).withdrawFunds(largeAmount);
    } catch (error) {
        console.log("Expected error caught:", error.message);
    }

    try {
        console.log("Testing unauthorized operator action...");
        await layer2Scaling.connect(user1).submitBatch([tx1Hash]);
    } catch (error) {
        console.log("Expected error caught:", error.message);
    }

    console.log("\n✅ All tests completed!");
    console.log("\nTo interact with the contract:");
    console.log(`1. Contract Address: ${contractAddress}`);
    console.log("2. Available Accounts:");
    console.log(`   Admin: ${admin.address}`);
    console.log(`   Operator: ${operator.address}`);
    console.log(`   User1: ${user1.address}`);
    console.log(`   User2: ${user2.address}`);
    console.log("\n3. Import private keys to MetaMask:");
    console.log("   Admin: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
    console.log("   Operator: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
    console.log("   User1: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 