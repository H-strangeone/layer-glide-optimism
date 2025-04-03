
const { ethers } = require('ethers');

class MerkleTree {
  constructor(transactions) {
    // Create leaf nodes
    this.leaves = transactions.map(tx => this.hashTransaction(tx));
    this.buildTree();
  }

  hashTransaction(transaction) {
    const encodedData = JSON.stringify({
      sender: transaction.sender.toLowerCase(),
      recipient: transaction.recipient.toLowerCase(),
      amount: transaction.amount
    });
    
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(encodedData));
  }

  buildTree() {
    this.layers = [this.leaves];
    
    // Build the Merkle tree bottom-up
    while (this.layers[this.layers.length - 1].length > 1) {
      const currentLayer = this.layers[this.layers.length - 1];
      const nextLayer = [];
      
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

  hashPair(left, right) {
    // Sort the hashes to ensure the same result regardless of order
    const sortedHashes = [left, right].sort();
    return ethers.utils.keccak256(
      ethers.utils.concat([
        ethers.utils.arrayify(sortedHashes[0]),
        ethers.utils.arrayify(sortedHashes[1])
      ])
    );
  }

  getRoot() {
    return this.layers[this.layers.length - 1][0];
  }

  getProof(index) {
    if (index < 0 || index >= this.leaves.length) {
      throw new Error('Index out of range');
    }
    
    const proof = [];
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

  verifyProof(transaction, proof, root) {
    let leaf = this.hashTransaction(transaction);
    let currentHash = leaf;
    
    for (const proofElement of proof) {
      currentHash = this.hashPair(currentHash, proofElement);
    }
    
    return currentHash === root;
  }
}

module.exports = MerkleTree;
