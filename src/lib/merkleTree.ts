
import { keccak256 } from 'ethers';

export interface Transaction {
  sender: string;
  recipient: string;
  amount: string;
}

export class MerkleTree {
  private leaves: string[] = [];
  private layers: string[][] = [];

  constructor(transactions: Transaction[]) {
    // Create leaf nodes
    this.leaves = transactions.map(tx => this.hashTransaction(tx));
    this.buildTree();
  }

  private hashTransaction(transaction: Transaction): string {
    const encodedData = JSON.stringify({
      sender: transaction.sender.toLowerCase(),
      recipient: transaction.recipient.toLowerCase(),
      amount: transaction.amount
    });
    
    return keccak256(Buffer.from(encodedData));
  }

  private buildTree(): void {
    this.layers = [this.leaves];
    
    // Build the Merkle tree bottom-up
    while (this.layers[this.layers.length - 1].length > 1) {
      const currentLayer = this.layers[this.layers.length - 1];
      const nextLayer: string[] = [];
      
      for (let i = 0; i < currentLayer.length; i += 2) {
        if (i + 1 < currentLayer.length) {
          const left = currentLayer[i];
          const right = currentLayer[i + 1];
          nextLayer.push(this.hashPair(left, right));
        } else {
          // If odd number of elements, duplicate the last one
          nextLayer.push(currentLayer[i]);
        }
      }
      
      this.layers.push(nextLayer);
    }
  }

  private hashPair(left: string, right: string): string {
    // Sort the hashes to ensure the same result regardless of order
    const sortedHashes = [left, right].sort();
    const concatenated = Buffer.concat([
      Buffer.from(sortedHashes[0].slice(2), 'hex'),
      Buffer.from(sortedHashes[1].slice(2), 'hex')
    ]);
    
    return keccak256(concatenated);
  }

  getRoot(): string {
    return this.layers[this.layers.length - 1][0];
  }

  getProof(index: number): string[] {
    if (index < 0 || index >= this.leaves.length) {
      throw new Error('Index out of range');
    }
    
    const proof: string[] = [];
    let currentIndex = index;
    
    for (let i = 0; i < this.layers.length - 1; i++) {
      const currentLayer = this.layers[i];
      const isRightNode = currentIndex % 2 === 0;
      const siblingIndex = isRightNode ? currentIndex + 1 : currentIndex - 1;
      
      if (siblingIndex < currentLayer.length) {
        proof.push(currentLayer[siblingIndex]);
      }
      
      // Update index for the next layer
      currentIndex = Math.floor(currentIndex / 2);
    }
    
    return proof;
  }

  verifyProof(transaction: Transaction, proof: string[], root: string): boolean {
    let leaf = this.hashTransaction(transaction);
    let currentHash = leaf;
    
    for (const proofElement of proof) {
      // Sort and hash to ensure we get the same result as when building the tree
      currentHash = this.hashPair(currentHash, proofElement);
    }
    
    return currentHash === root;
  }
}

// Helper function to create a Merkle tree from transactions
export const createMerkleTreeFromTransactions = (transactions: Transaction[]): MerkleTree => {
  return new MerkleTree(transactions);
};

// Helper function to get transaction root
export const getTransactionRoot = (transactions: Transaction[]): string => {
  const tree = createMerkleTreeFromTransactions(transactions);
  return tree.getRoot();
};

// Helper function to get proof for a transaction
export const getProofForTransaction = (transactions: Transaction[], index: number): string[] => {
  const tree = createMerkleTreeFromTransactions(transactions);
  return tree.getProof(index);
};
