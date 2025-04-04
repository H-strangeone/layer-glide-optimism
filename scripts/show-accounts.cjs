const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("\nHardhat Accounts and Private Keys:");
    console.log("===================================");

    const accounts = await ethers.getSigners();

    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const balance = await ethers.provider.getBalance(account.address);
        console.log(`Account ${i}:`);
        console.log(`Address: ${account.address}`);
        console.log(`Private Key: ${account.privateKey || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"}`);
        console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
        console.log("-----------------------------------");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 