import { ethers } from 'ethers';

export interface Transaction {
  sender: string;
  recipient: string;
  amount: string;
}

export class MerkleTree {
  private elements: string[];
  private bufferElementPositionIndex: { [hexElement: string]: number };
  private layers: string[][];

  constructor(elements: string[]) {
    this.elements = [...elements];
    this.bufferElementPositionIndex = {};
    this.layers = [];
    this._initialize();
  }

  private _initialize() {
    this.elements = this.elements.filter(Boolean);
    this.elements.sort();
    this._removeDuplicates();

    this._createLayers();
  }

  private _removeDuplicates() {
    this.elements = this.elements.filter((item, pos) => {
      return this.elements.indexOf(item) === pos;
    });
  }

  private _createLayers() {
    this.layers = [this.elements];

    while (this.layers[this.layers.length - 1].length > 1) {
      this.layers.push(this._getNextLayer());
    }
  }

  private _getNextLayer(): string[] {
    const layer = this.layers[this.layers.length - 1];
    const nextLayer = [];

    for (let i = 0; i < layer.length; i += 2) {
      if (i + 1 === layer.length) {
        nextLayer.push(layer[i]);
      } else {
        nextLayer.push(this._hashPair(layer[i], layer[i + 1]));
      }
    }

    return nextLayer;
  }

  private _hashPair(a: string, b: string): string {
    return a < b
      ? ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['bytes32', 'bytes32'], [a, b]))
      : ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['bytes32', 'bytes32'], [b, a]));
  }

  public getRoot(): string {
    return this.layers[this.layers.length - 1][0];
  }

  public getProof(element: string): string[] {
    let index = this._getBufferElementPositionIndex(element);
    const proof: string[] = [];

    for (let i = 0; i < this.layers.length - 1; i++) {
      const layer = this.layers[i];
      const isRightNode = index % 2 === 1;
      const pairIndex = isRightNode ? index - 1 : index + 1;

      if (pairIndex < layer.length) {
        proof.push(layer[pairIndex]);
      }

      index = Math.floor(index / 2);
    }

    return proof;
  }

  private _getBufferElementPositionIndex(element: string): number {
    const index = this.bufferElementPositionIndex[element];
    if (typeof index !== 'number') {
      throw new Error('Element not found in Merkle tree');
    }
    return index;
  }
}

export function createMerkleTreeFromTransactions(transactions: Transaction[]): MerkleTree {
  const elements = transactions.map(tx =>
    ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint256'],
        [tx.sender, tx.recipient, ethers.parseEther(tx.amount)]
      )
    )
  );

  return new MerkleTree(elements);
}

export function verifyMerkleProof(
  leaf: string,
  proof: string[],
  root: string
): boolean {
  let computedHash = leaf;

  for (let i = 0; i < proof.length; i++) {
    const proofElement = proof[i];
    computedHash = computedHash < proofElement
      ? ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['bytes32', 'bytes32'], [computedHash, proofElement]))
      : ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['bytes32', 'bytes32'], [proofElement, computedHash]));
  }

  return computedHash === root;
}

export function hashTransaction(tx: Transaction): string {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'address', 'uint256'],
      [tx.sender, tx.recipient, ethers.parseEther(tx.amount)]
    )
  );
}
