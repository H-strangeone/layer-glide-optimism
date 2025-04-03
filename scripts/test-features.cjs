const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("Testing Layer 2 features...");

    // Get test accounts
    const [admin, operator, user1] = await hre.ethers.getSigners();
    console.log("\nAccounts:");
    console.log(`Admin: ${admin.address}`);
    console.log(`Operator: ${operator.address}`);
    console.log(`User1: ${user1.address}`);

    // Get the deployed contract
    const Layer2Scaling = await hre.ethers.getContractFactory("Layer2Scaling");
    const layer2Scaling = await Layer2Scaling.deploy();
    await layer2Scaling.waitForDeployment();
    console.log(`\nContract deployed to: ${await layer2Scaling.getAddress()}`);

    // Test 1: Admin Role
    console.log("\n1. Testing Admin Functions:");
    console.log("-------------------------");
    const adminAddress = await layer2Scaling.admin();
    console.log(`Contract Admin: ${adminAddress}`);
    console.log(`Is admin correct? ${adminAddress === admin.address}`);

    // Test 2: Add Operator
    console.log("\n2. Testing Operator Management:");
    console.log("-----------------------------");
    await layer2Scaling.addOperator(operator.address);
    const isOperator = await layer2Scaling.isOperator(operator.address);
    console.log(`Is operator added? ${isOperator}`);

    // Test 3: Deposit Funds
    console.log("\n3. Testing Deposits:");
    console.log("------------------");
    const depositAmount = ethers.parseEther("1.0");
    const depositTx = await layer2Scaling.connect(user1).depositFunds({ value: depositAmount });
    await depositTx.wait();
    const balance = await layer2Scaling.balances(user1.address);
    console.log(`User1 L2 balance: ${ethers.formatEther(balance)} ETH`);

    // Test 4: Submit Batch
    console.log("\n4. Testing Batch Submission:");
    console.log("--------------------------");
    const transactionRoot = ethers.keccak256(ethers.toUtf8Bytes("test transaction"));
    const batchTx = await layer2Scaling.connect(operator).submitBatch([transactionRoot]);
    await batchTx.wait();
    const nextBatchId = await layer2Scaling.nextBatchId();
    console.log(`Next batch ID: ${nextBatchId}`);

    // Test 5: Verify Batch
    console.log("\n5. Testing Batch Verification:");
    console.log("----------------------------");
    const verifyTx = await layer2Scaling.verifyBatch(1);
    await verifyTx.wait();
    const batch = await layer2Scaling.batches(1);
    console.log(`Batch verified: ${batch.verified}`);

    // Test 6: Withdraw Funds
    console.log("\n6. Testing Withdrawals:");
    console.log("---------------------");
    const withdrawAmount = ethers.parseEther("0.5");
    const withdrawTx = await layer2Scaling.connect(user1).withdrawFunds(withdrawAmount);
    await withdrawTx.wait();
    const newBalance = await layer2Scaling.balances(user1.address);
    console.log(`User1 L2 balance after withdrawal: ${ethers.formatEther(newBalance)} ETH`);

    console.log("\nAll tests completed!");
    console.log("\nTo interact with these features in the UI:");
    console.log("1. Import these accounts to MetaMask:");
    console.log("   Admin: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
    console.log("   Operator: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
    console.log("2. Use Admin account to manage operators");
    console.log("3. Use Operator account to submit and verify batches");
    console.log("4. Use any account to deposit and withdraw funds");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 