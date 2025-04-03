import { ethers } from "hardhat";

async function main() {
    const accounts = await ethers.getSigners();

    console.log("\nHardhat Accounts and Private Keys:");
    console.log("===================================");

    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const privateKey = account.privateKey;
        const balance = await account.getBalance();

        console.log(`\nAccount #${i}:`);
        console.log(`Address: ${account.address}`);
        console.log(`Private Key: ${privateKey}`);
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