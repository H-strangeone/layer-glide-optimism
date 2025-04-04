import { ethers } from 'ethers';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';

export interface Transaction {
    from: string;
    to: string;
    value: string;
}

export function createMerkleTreeFromTransactions(transactions: Transaction[]): MerkleTree {
    if (transactions.length === 0) {
        throw new Error("Cannot create Merkle tree from empty transactions array");
    }

    // Create leaf nodes by hashing each transaction
    const leaves = transactions.map(tx => {
        // Create a packed encoding of the transaction data
        const encodedData = ethers.solidityPacked(
            ['address', 'address', 'uint256'],
            [tx.from, tx.to, ethers.parseEther(tx.value)]
        );
        // Hash the encoded data
        return keccak256(encodedData);
    });

    // Create Merkle tree
    const tree = new MerkleTree(leaves, keccak256, {
        sortPairs: true,
        hashLeaves: false // We've already hashed our leaves
    });

    return tree;
}

export function getTransactionHash(transaction: Transaction): Buffer {
    const encodedData = ethers.solidityPacked(
        ['address', 'address', 'uint256'],
        [transaction.from, transaction.to, ethers.parseEther(transaction.value)]
    );
    return keccak256(encodedData);
}

export function verifyTransaction(
    transaction: Transaction,
    proof: string[],
    root: string
): boolean {
    const leaf = getTransactionHash(transaction);
    const merkleTree = new MerkleTree([], keccak256, { sortPairs: true });
    return merkleTree.verify(proof, leaf, root);
} 