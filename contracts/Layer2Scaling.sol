// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Layer2Scaling {
    struct Batch {
        uint256 batchId;
        bytes32 transactionsRoot;
        uint256 timestamp;
        bool verified;
        bool finalized;
    }

    struct Transaction {
        address sender;
        address recipient;
        uint256 amount;
    }

    mapping(uint256 => Batch) public batches;
    uint256 public nextBatchId;
    mapping(address => uint256) public balances;
    uint256 public slashingPenalty = 0.05 ether;
    
    // Add admin role
    address public admin;
    mapping(address => bool) public isOperator;
    
    event AdminChanged(address indexed previousAdmin, address indexed newAdmin);
    event OperatorAdded(address indexed operator);
    event OperatorRemoved(address indexed operator);
    event BatchSubmitted(uint256 indexed batchId, bytes32 transactionsRoot);
    event BatchVerified(uint256 indexed batchId);
    event FraudReported(uint256 indexed batchId, bytes32 fraudProof);
    event FundsDeposited(address indexed user, uint256 amount);
    event FundsWithdrawn(address indexed user, uint256 amount);
    event FraudPenaltyApplied(address indexed user, uint256 penalty);
    event BatchFinalized(uint256 indexed batchId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    modifier onlyOperator() {
        require(isOperator[msg.sender] || msg.sender == admin, "Only operators can call this function");
        _;
    }

    modifier batchExists(uint256 _batchId) {
        require(batches[_batchId].batchId != 0, "Batch does not exist");
        _;
    }

    constructor() {
        admin = msg.sender;
        nextBatchId = 1;
        isOperator[msg.sender] = true;
    }

    function changeAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "New admin cannot be zero address");
        address oldAdmin = admin;
        admin = newAdmin;
        emit AdminChanged(oldAdmin, newAdmin);
    }

    function addOperator(address operator) external onlyAdmin {
        require(!isOperator[operator], "Already an operator");
        isOperator[operator] = true;
        emit OperatorAdded(operator);
    }

    function removeOperator(address operator) external onlyAdmin {
        require(operator != admin, "Cannot remove admin as operator");
        require(isOperator[operator], "Not an operator");
        isOperator[operator] = false;
        emit OperatorRemoved(operator);
    }

    function submitBatch(bytes32[] memory _transactionsRoots) external onlyOperator {
        require(_transactionsRoots.length > 0, "Batch must contain transactions");
        for (uint256 i = 0; i < _transactionsRoots.length; i++) {
            batches[nextBatchId] = Batch(nextBatchId, _transactionsRoots[i], block.timestamp, false, false);
            emit BatchSubmitted(nextBatchId, _transactionsRoots[i]);
            nextBatchId++;
        }
    }

    function verifyBatch(uint256 _batchId) external batchExists(_batchId) {
        require(!batches[_batchId].finalized, "Batch is finalized");
        require(!batches[_batchId].verified, "Batch already verified");
        batches[_batchId].verified = true;
        emit BatchVerified(_batchId);
    }

    function reportFraud(uint256 _batchId, bytes32 _fraudProof, Transaction memory _tx, bytes32[] memory _merkleProof) external batchExists(_batchId) {
        require(!batches[_batchId].verified, "Cannot report fraud on a verified batch");
        require(!batches[_batchId].finalized, "Cannot report fraud on a finalized batch");

        bool fraudFound = detectFraud(_batchId, _fraudProof, _tx, _merkleProof);
        if (!fraudFound) {
            require(balances[msg.sender] >= slashingPenalty, "Insufficient balance for penalty");
            balances[msg.sender] -= slashingPenalty;
            emit FraudPenaltyApplied(msg.sender, slashingPenalty);
        } else {
            // Invalidate batch (simplified for demo)
            batches[_batchId].transactionsRoot = bytes32(0);
        }
        emit FraudReported(_batchId, _fraudProof);
    }

    function detectFraud(uint256 _batchId, bytes32 _fraudProof, Transaction memory _tx, bytes32[] memory _merkleProof) internal view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(_tx.sender, _tx.recipient, _tx.amount));
        bytes32 root = batches[_batchId].transactionsRoot;
        return verifyMerkleProof(leaf, _merkleProof, root) && _fraudProof != leaf; // Fraud if proof doesn't match expected tx
    }

    function verifyMerkleProof(bytes32 leaf, bytes32[] memory proof, bytes32 root) internal pure returns (bool) {
        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            computedHash = computedHash < proofElement ? 
                keccak256(abi.encodePacked(computedHash, proofElement)) : 
                keccak256(abi.encodePacked(proofElement, computedHash));
        }
        return computedHash == root;
    }

    function finalizeBatch(uint256 _batchId) external batchExists(_batchId) {
        require(!batches[_batchId].finalized, "Batch already finalized");
        require(block.timestamp > batches[_batchId].timestamp + 1 weeks, "Challenge period not over");
        batches[_batchId].finalized = true;
        emit BatchFinalized(_batchId);
    }

    function depositFunds() external payable {
        require(msg.value > 0, "Deposit must be greater than zero");
        balances[msg.sender] += msg.value;
        emit FundsDeposited(msg.sender, msg.value);
    }

    function withdrawFunds(uint256 _amount) external {
        uint256 userBalance = balances[msg.sender];
        require(userBalance >= _amount, "Insufficient balance");
        balances[msg.sender] = userBalance - _amount;
        (bool success, ) = payable(msg.sender).call{value: _amount}("");
        require(success, "Transfer failed");
        emit FundsWithdrawn(msg.sender, _amount);
    }

    function batchTransfer(address[] memory recipients, uint256[] memory amounts) external payable {
        require(recipients.length == amounts.length, "Mismatched arrays");
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        require(msg.value >= totalAmount, "Insufficient ETH sent");
        for (uint256 i = 0; i < recipients.length; i++) {
            (bool success, ) = payable(recipients[i]).call{value: amounts[i]}("");
            require(success, "Transfer failed");
        }
    }

    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }
}
