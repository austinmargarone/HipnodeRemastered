// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract NosoToken is ERC20, ERC20Burnable,  AccessControl, Pausable {
    using SafeMath for uint256;

 
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant DEFLATION_ADMIN_ROLE = keccak256("DEFLATION_ADMIN_ROLE");

    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant FLASH_LOAN_FEE = 9; // 0.09% fee
    uint256 public constant MAX_BURN_RATE = 1000; // 10% max burn rate
    uint256 public burnRate; // Configurable burn rate, initially 0
    uint256 public governanceThreshold;
    uint256 public proposalCount;

    

    struct Proposal {
        address proposer;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        address target;
        bytes data;
        mapping(address => bool) hasVoted;
    }

    

    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public lastFlashLoan;
   

    event ProposalCreated(uint256 indexed proposalId, address proposer, string description, uint256 startTime, uint256 endTime);
    event Voted(uint256 indexed proposalId, address voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);
    event FlashLoan(address indexed receiver, uint256 amount, uint256 fee);
    event BurnRateUpdated(uint256 newBurnRate);

    constructor(address defaultAdmin, address pauser, address minter, address governance) 
        ERC20("Node Social Token", "NOSO") 
        
    {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSER_ROLE, pauser);
        _grantRole(MINTER_ROLE, minter);
        _grantRole(GOVERNANCE_ROLE, governance);
        _grantRole(DEFLATION_ADMIN_ROLE, defaultAdmin);

        governanceThreshold = 100_000 * 10**18; // 100,000 tokens required to create a proposal
        burnRate = 0; // Initially non-deflationary
    }

    function setBurnRate(uint256 newBurnRate) external onlyRole(DEFLATION_ADMIN_ROLE) {
        require(newBurnRate <= MAX_BURN_RATE, "Burn rate exceeds maximum");
        burnRate = newBurnRate;
        emit BurnRateUpdated(newBurnRate);
    }


    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function mintWithCheck(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mintWithMaxSupplyCheck(to, amount);
    }

    function flashLoan(uint256 amount, address receiver) external {
        require(amount <= balanceOf(address(this)), "Not enough tokens in pool");
        require(block.timestamp > lastFlashLoan[receiver] + 1 minutes, "Too frequent flash loans");

        uint256 fee = amount.mul(FLASH_LOAN_FEE).div(10000);
        uint256 amountToRepay = amount.add(fee);

        _transfer(address(this), receiver, amount);

        require(
            IERC20(address(this)).transferFrom(receiver, address(this), amountToRepay),
            "Flash loan not repaid"
        );

        lastFlashLoan[receiver] = block.timestamp;
        emit FlashLoan(receiver, amount, fee);
    }

    function createProposal(string memory description, uint256 duration, address target, bytes memory data) external returns (uint256) {
        require(balanceOf(msg.sender) >= governanceThreshold, "Not enough tokens to create proposal");

        proposalCount++;
        Proposal storage newProposal = proposals[proposalCount];
        newProposal.proposer = msg.sender;
        newProposal.description = description;
        newProposal.startTime = block.timestamp;
        newProposal.endTime = block.timestamp + duration;
        newProposal.target = target;
        newProposal.data = data;

        emit ProposalCreated(proposalCount, msg.sender, description, newProposal.startTime, newProposal.endTime);
        return proposalCount;
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.startTime && block.timestamp <= proposal.endTime, "Voting is not active");
        require(!proposal.hasVoted[msg.sender], "Already voted");

        uint256 weight = balanceOf(msg.sender);
        require(weight > 0, "No voting power");

        proposal.hasVoted[msg.sender] = true;

        if (support) {
            proposal.forVotes = proposal.forVotes.add(weight);
        } else {
            proposal.againstVotes = proposal.againstVotes.add(weight);
        }

        emit Voted(proposalId, msg.sender, support, weight);
    }

    function executeProposal(uint256 proposalId) external onlyRole(GOVERNANCE_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp > proposal.endTime, "Voting period not ended");
        require(!proposal.executed, "Proposal already executed");
        require(proposal.forVotes > proposal.againstVotes, "Proposal did not pass");

        proposal.executed = true;

        // Execute the proposal
        (bool success, ) = proposal.target.call(proposal.data);
        require(success, "Proposal execution failed");

        emit ProposalExecuted(proposalId);
    }

    function setGovernanceThreshold(uint256 newThreshold) external onlyRole(GOVERNANCE_ROLE) {
        governanceThreshold = newThreshold;
    }

    function _update(address from, address to, uint256 amount) internal virtual override {
        super._update(from, to, amount);
        
        if (!paused()) {
            // Add any additional checks here if needed
        }

        // Apply deflationary mechanism if burn rate is set
        if (burnRate > 0 && from != address(0) && to != address(0)) { // Exclude minting and burning
            uint256 burnAmount = amount.mul(burnRate).div(10000);
            _burn(to, burnAmount);
        }
    }

    function _mintWithMaxSupplyCheck(address account, uint256 amount) internal {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(account, amount);
    }

    
    function transferWithCheck(address to, uint256 amount) public virtual returns (bool) {
        return transfer(to, amount);
    }

    function transferFromWithCheck(address from, address to, uint256 amount) public virtual returns (bool) {
        return transferFrom(from, to, amount);
    }
    

    
}