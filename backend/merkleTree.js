import { ethers } from 'ethers';

/**
 * A simple Merkle tree implementation for generating and verifying Merkle proofs
 */
class MerkleTree {
  /**
   * Creates a new Merkle tree from an array of leaves
   * @param {Array<string>} leaves - Array of leaf hashes
   */
  constructor(leaves) {
    this.leaves = leaves;
    this.layers = [leaves];
    this.buildTree();
  }

  /**
   * Builds the Merkle tree from the leaves
   */
  buildTree() {
    let currentLayer = this.leaves;

    while (currentLayer.length > 1) {
      const nextLayer = [];

      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left;

        const combined = ethers.utils.keccak256(
          ethers.utils.concat([left, right])
        );

        nextLayer.push(combined);
      }

      this.layers.push(nextLayer);
      currentLayer = nextLayer;
    }
  }

  /**
   * Gets the Merkle root of the tree
   * @returns {string} The Merkle root hash
   */
  getRoot() {
    return this.layers[this.layers.length - 1][0];
  }

  /**
   * Gets a Merkle proof for a leaf at the specified index
   * @param {number} index - The index of the leaf
   * @returns {Array<string>} The Merkle proof
   */
  getProof(index) {
    const proof = [];
    let currentIndex = index;

    for (let i = 0; i < this.layers.length - 1; i++) {
      const layer = this.layers[i];
      const isRight = currentIndex % 2 === 1;
      const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;

      if (siblingIndex < layer.length) {
        proof.push(layer[siblingIndex]);
      } else {
        // If there's no sibling, use the node itself
        proof.push(layer[currentIndex]);
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }

  /**
   * Verifies a Merkle proof
   * @param {string} leaf - The leaf hash
   * @param {Array<string>} proof - The Merkle proof
   * @param {string} root - The Merkle root
   * @returns {boolean} Whether the proof is valid
   */
  static verify(leaf, proof, root) {
    let currentHash = leaf;

    for (const proofElement of proof) {
      const [left, right] = currentHash < proofElement
        ? [currentHash, proofElement]
        : [proofElement, currentHash];

      currentHash = ethers.utils.keccak256(
        ethers.utils.concat([left, right])
      );
    }

    return currentHash === root;
  }
}

export default MerkleTree;
