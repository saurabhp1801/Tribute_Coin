# MagaFox47 Token Contract Documentation

A comprehensive guide to the MagaFox47 ERC20 token contract, which includes advanced features such as charity donations, vesting schedules, transaction fees, and robust tokenomics.

## Overview

MagaFox47 is an ERC20 token with the following key features:
- Role-based access control for administrative functions
- Charity donation functionality with approved charity management
- Vesting schedules for different token allocations
- Transaction fees that support hunger initiatives
- Pausing capability for emergency situations
- Buyback and burn mechanism

## Contract Specifications

- **Token Name**: MagaFox47
- **Symbol**: MAGA
- **Total Supply**: 1,000,000,000 tokens (configurable)
- **Decimals**: 18 (ERC20 default)

## Tokenomics

The contract implements the following token allocation:

| Allocation | Percentage | Amount | Vesting Schedule |
|------------|------------|--------|-----------------|
| Charity Fund | 40% | 400M | Quarterly release over 2.5 years |
| Private Sale | 20% | 200M | Linear vesting over 1 year |
| Public Sale | 20% | 200M | Linear vesting over 6 months |
| Development Fund | 10% | 100M | Monthly release over 1 year |
| Team & Advisors | 5% | 50M | 12-month cliff, then 24-month vesting |
| Community Rewards | 5% | 50M | Linear vesting over 2 years |

## Key Roles

The contract implements role-based access control:

- **DEFAULT_ADMIN_ROLE**: Can grant/revoke roles, pause/unpause the contract, and update contract metadata
- **MINTER_ROLE**: Can mint new tokens
- **CHARITY_ADMIN_ROLE**: Can manage approved charities and execute donations

## Wallet Types

The contract defines the following wallet types:

- `CHARITY_FUND`: Receives transaction fees for charitable causes
- `TEAM_ADVISORS`: For team and advisor allocations
- `DEVELOPMENT_FUND`: For development expenses
- `COMMUNITY_REWARDS`: For community rewards and staking
- `LIQUIDITY_POOL`: Receives a portion of transaction fees
- `TREASURY`: For token buyback and other operations
- `PRIVATE_SALE`: For private sale allocations
- `PUBLIC_SALE`: For public sale allocations

## Main Functions

### Administrative Functions

```solidity
// Wallet management
function allocateWallets(WalletType[] calldata walletTypes, address[] calldata walletAddresses) external onlyOwner

// Contract state management
function setContractState(uint8 stateType, bool enabled) external onlyOwner
// stateType: 1=Minting, 2=Transaction Fees, 3=Lock Tokenomics, 4=Pause/Unpause

// Transaction fees
function setTransactionFeePercent(uint256 feePercent) external onlyOwner

// Contract state
function transferAdminRole(address newAdmin) external
function updateImageURI(string memory newImageURI) external
```

### Charity Management Functions

```solidity
function manageCharity(uint8 actionType, address charityAddress, string memory charityName) external
// actionType: 1=Add Charity, 2=Remove Charity

function getCharityCount() external view returns (uint256)
function donateToCharity(address charityAddress, uint256 amount) external nonReentrant
```

### Token Release Functions

```solidity
function releaseTokens(uint8 allocationType, address beneficiary, uint256 amount) external onlyOwner nonReentrant
// allocationType: 1=TeamAdvisors, 2=DevelopmentFund, 3=PrivateSale, 4=PublicSale, 5=CommunityRewards
```

### Token Operations

```solidity
function mint(address to, uint256 amount, bool enforceOneMintPerAddress) public nonReentrant
function mintWithoutRestriction(address to, uint256 amount) public
function executeBuyback(uint256 amount) external onlyOwner nonReentrant
```

### View Functions

```solidity
function imageURI() external view returns (string memory)
function getCharityCount() external view returns (uint256)
function supportsInterface(bytes4 interfaceId) public view override returns (bool)
```

## Transaction Fee Mechanism

When transaction fees are enabled:
- A configurable percentage (default 1%, max 5%) is taken from transfers
- 50% of the fee goes to the Charity Fund wallet
- 50% of the fee goes to the Liquidity Pool wallet

## Vesting Mechanism

The contract implements linear vesting for all token allocations:
- Tokens unlock at a constant rate over the duration
- Each allocation has its own start time and duration
- Released tokens are minted to the beneficiary's address when requested

## Security Considerations

The contract implements several security features:
- Role-based access control for sensitive operations
- Custom error messages for better error handling and gas efficiency
- Pause functionality for emergency situations
- Input validation for critical parameters
- Prevention of zero-address transfers
- Tokenomics locking to prevent modifications after deployment
- ReentrancyGuard for functions involving token transfers

## Custom Errors

For gas optimization, the contract uses custom errors instead of require statements:

- `Unauthorized`: Called by unauthorized address
- `InvalidInput`: Invalid input parameters provided
- `ContractState`: Called when contract is in the wrong state (paused, minting disabled, etc.)
- `AllocationExceeded`: Trying to release more tokens than available
- `OwnableUnauthorizedAccount`: Called by non-owner account for onlyOwner functions

## Dependencies

The contract uses the following OpenZeppelin contracts:
- AccessControl
- ERC20Burnable
- ERC20
- Pausable
- Ownable
- ReentrancyGuard

## Hardhat Console Testing Guide

This section provides a comprehensive set of Hardhat console commands to test the MagaFox47 ERC20 token contract. Each section includes the commands to run and the expected output.

### Prerequisites

- Node.js (v14+ recommended)
- Hardhat installed (`npm install --save-dev hardhat`)
- Required dependencies:
  ```
  npm install --save-dev @openzeppelin/contracts @nomiclabs/hardhat-ethers ethers
  ```

### Getting Started

1. Clone the repository or set up your Hardhat project
2. Ensure the MagaFox47 contract is in your `contracts` directory
3. Start the Hardhat console:

```bash
npx hardhat console --network hardhat
```

### Test Commands and Expected Outputs

#### 1. Setting Up Accounts and Contract

**Commands:**
```javascript
// Get test accounts
const [owner, user1, user2, charityWallet, privateSaleBuyer, publicSaleBuyer, devFundReceiver] = await ethers.getSigners();

// Get contract factory
const MagaFox47 = await ethers.getContractFactory("MagaFox47");

// Deploy contract with initial parameters
const totalSupply = ethers.parseEther("1000000000");
const initialWallets = [
  charityWallet.address, // CHARITY_FUND
  user1.address,         // TEAM_ADVISORS
  user2.address,         // DEVELOPMENT_FUND
  ethers.ZeroAddress,    // COMMUNITY_REWARDS
  ethers.ZeroAddress,    // LIQUIDITY_POOL
  owner.address,         // TREASURY
  privateSaleBuyer.address, // PRIVATE_SALE
  publicSaleBuyer.address   // PUBLIC_SALE
];

const magaFox = await MagaFox47.deploy(
  "MagaFox47", 
  "MAGA", 
  totalSupply, 
  "https://example.com/token-image.png",
  initialWallets
);

// Wait for deployment
await magaFox.waitForDeployment();

// Get contract address
const magaFoxAddress = await magaFox.getAddress();
console.log("Contract deployed to:", magaFoxAddress);

```

**Expected Output:**
```
Contract deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```
(Note: Your contract address will be different)

#### 2. Basic Contract Information

**Commands:**
```javascript
// Get token name and symbol
const name = await magaFox.name();
const symbol = await magaFox.symbol();
console.log(`Token name: ${name}, Symbol: ${symbol}`);

// Get token image URI
const imageURI = await magaFox.imageURI();
console.log(`Token image URI: ${imageURI}`);

// Get total supply
const supply = await magaFox.totalSupply();
console.log(`Total supply: ${ethers.formatEther(supply)} tokens`);

// Get initial balance (should be 0 since tokens are in allocations)
const ownerBalance = await magaFox.balanceOf(owner.address);
console.log(`Owner balance: ${ethers.formatEther(ownerBalance)} tokens`);
```

**Expected Output:**
```
Token name: MagaFox47, Symbol: MAGA
Token image URI: https://example.com/token-image.png
Total supply: 0.0 tokens  // Initially 0 because tokens are not minted yet
Owner balance: 0.0 tokens
```

#### 3. Testing Role-Based Access Control

**Commands:**
```javascript
// Check owner roles
const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
const CHARITY_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CHARITY_ADMIN_ROLE"));
const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

const isOwnerAdmin = await magaFox.hasRole(DEFAULT_ADMIN_ROLE, owner.address);
const isOwnerMinter = await magaFox.hasRole(MINTER_ROLE, owner.address);
const isOwnerCharityAdmin = await magaFox.hasRole(CHARITY_ADMIN_ROLE, owner.address);
console.log(`Owner is admin: ${isOwnerAdmin}, Owner is minter: ${isOwnerMinter}, Owner is charity admin: ${isOwnerCharityAdmin}`);

// Grant roles to user1
await magaFox.grantRole(MINTER_ROLE, user1.address);
const isUser1Minter = await magaFox.hasRole(MINTER_ROLE, user1.address);
console.log(`User1 is minter: ${isUser1Minter}`);

// Enable minting to test minting functionality
await magaFox.setContractState(1, true); // 1 = Minting status, true = enable
console.log(`Minting enabled: ${await magaFox.isMintingEnabled()}`);

// Test minting with user1 account
await magaFox.connect(user1).mint(user2.address, ethers.parseEther("1000"), true);
const user2Balance = await magaFox.balanceOf(user2.address);
console.log(`User2 balance after mint: ${ethers.formatEther(user2Balance)} tokens`);
```

**Expected Output:**
```
Owner is admin: true, Owner is minter: true, Owner is charity admin: true
User1 is minter: true
Minting enabled: true
User2 balance after mint: 1000.0 tokens
```

#### 4. Testing Tokenomics

**Commands:**
```javascript
// Check tokenomics allocations
const charityFund = await magaFox.charityFund();
const privateSale = await magaFox.privateSale();
const publicSale = await magaFox.publicSale();
const developmentFund = await magaFox.developmentFund();
const teamAdvisors = await magaFox.teamAdvisors();
const communityRewards = await magaFox.communityRewards();

console.log("Charity Fund:", {
  totalAmount: ethers.formatEther(charityFund.totalAmount),
  released: ethers.formatEther(charityFund.released),
  startTime: new Date(Number(charityFund.startTime) * 1000).toISOString(),
  duration: `${Number(charityFund.duration) / (24*60*60)} days`,
  locked: charityFund.locked
});

console.log("Private Sale:", {
  totalAmount: ethers.formatEther(privateSale.totalAmount),
  released: ethers.formatEther(privateSale.released),
  startTime: new Date(Number(privateSale.startTime) * 1000).toISOString(),
  duration: `${Number(privateSale.duration) / (24*60*60)} days`,
  locked: privateSale.locked
});

console.log("Team & Advisors:", {
  totalAmount: ethers.formatEther(teamAdvisors.totalAmount),
  released: ethers.formatEther(teamAdvisors.released),
  startTime: new Date(Number(teamAdvisors.startTime) * 1000).toISOString(),
  duration: `${Number(teamAdvisors.duration) / (24*60*60)} days`,
  locked: teamAdvisors.locked
});
```

**Expected Output:**
```
Charity Fund: {
  totalAmount: '400000000.0',
  released: '0.0',
  startTime: '2025-04-21T15:30:00.000Z', // This will be your current timestamp
  duration: '900 days', // 10 quarters
  locked: false
}
Private Sale: {
  totalAmount: '200000000.0',
  released: '0.0',
  startTime: '2025-04-21T15:30:00.000Z', // This will be your current timestamp
  duration: '365 days',
  locked: false
}
Team & Advisors: {
  totalAmount: '50000000.0',
  released: '0.0',
  startTime: '2026-04-21T15:30:00.000Z', // This will be your current timestamp + 1 year (cliff)
  duration: '730 days', // 24 months after cliff
  locked: false
}
```

#### 5. Testing Wallet Allocation

**Commands:**
```javascript
// Check if wallets are already allocated from constructor
const isCharityWalletAllocated = await magaFox.isWalletAllocated(0); // CHARITY_FUND = 0
const charityWalletAddress = await magaFox.allocatedWallets(0);
console.log(`Charity wallet allocated: ${isCharityWalletAllocated}`);
console.log(`Charity wallet address: ${charityWalletAddress}`);

// Allocate additional wallets using the updated function
await magaFox.allocateWallets(
  [4], // LIQUIDITY_POOL = 4
  [user1.address]
);

const liquidityWalletAddress = await magaFox.allocatedWallets(4);
console.log(`Liquidity wallet address: ${liquidityWalletAddress}`);
```

**Expected Output:**
```
Charity wallet allocated: true
Charity wallet address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 // charityWallet's address
Liquidity wallet address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 // user1's address
```

#### 6. Testing Charity Management

**Commands:**
```javascript
// Approve a charity
await magaFox.manageCharity(1, charityWallet.address, "Hunger Relief Fund"); // 1 = Add charity
const charityInfo = await magaFox.approvedCharities(charityWallet.address);
console.log(`Charity name: ${charityInfo.name}, Approved: ${charityInfo.approved}`);

// Check charity count
const charityCount = await magaFox.getCharityCount();
console.log(`Number of approved charities: ${charityCount}`);

// Donate to charity
await magaFox.donateToCharity(charityWallet.address, ethers.parseEther("1000"));
const charityBalance = await magaFox.balanceOf(charityWallet.address);
console.log(`Charity wallet balance after donation: ${ethers.formatEther(charityBalance)} tokens`);
```

**Expected Output:**
```
Charity name: Hunger Relief Fund, Approved: true
Number of approved charities: 1
Charity wallet balance after donation: 1000.0 tokens
```

#### 7. Testing Vesting and Token Release

**Commands:**
```javascript
// Fast forward time to simulate vesting progress (1 month)
await network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
await network.provider.send("evm_mine");

// Release private sale tokens
await magaFox.releaseTokens(3, privateSaleBuyer.address, ethers.parseEther("10000")); // 3 = PrivateSale
const privateSaleBuyerBalance = await magaFox.balanceOf(privateSaleBuyer.address);
console.log(`Private sale buyer balance: ${ethers.formatEther(privateSaleBuyerBalance)} tokens`);

// Release development funds
await magaFox.releaseTokens(2, devFundReceiver.address, ethers.parseEther("5000")); // 2 = DevelopmentFund
const devReceiverBalance = await magaFox.balanceOf(devFundReceiver.address);
console.log(`Development fund receiver balance: ${ethers.formatEther(devReceiverBalance)} tokens`);

// Fast forward more time (6 months)
await network.provider.send("evm_increaseTime", [180 * 24 * 60 * 60]);
await network.provider.send("evm_mine");

// Release public sale tokens
await magaFox.releaseTokens(4, publicSaleBuyer.address, ethers.parseEther("20000")); // 4 = PublicSale
const publicSaleBuyerBalance = await magaFox.balanceOf(publicSaleBuyer.address);
console.log(`Public sale buyer balance: ${ethers.formatEther(publicSaleBuyerBalance)} tokens`);

// Fast forward more time (1 year to reach team tokens cliff)
await network.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
await network.provider.send("evm_mine");

// Release team tokens after cliff
await magaFox.releaseTokens(1, user2.address, ethers.parseEther("5000")); // 1 = TeamAdvisors
const teamTokensBalance = await magaFox.balanceOf(user2.address);
console.log(`Team tokens balance (after cliff): ${ethers.formatEther(teamTokensBalance)} tokens`);
```

**Expected Output:**
```
Private sale buyer balance: 10000.0 tokens
Development fund receiver balance: 5000.0 tokens
Public sale buyer balance: 20000.0 tokens
Team tokens balance (after cliff): 6000.0 tokens  // 1000 from previous mint + 5000 from team allocation
```

#### 8. Testing Transaction Fees

**Commands:**
```javascript
// Set transaction fee percent (2%)
await magaFox.setTransactionFeePercent(200); // 200 basis points = 2%
console.log(`Transaction fee set to: ${await magaFox.transactionFeePercent()} basis points`);

// Enable transaction fees
await magaFox.setContractState(2, true); // 2 = Transaction fees, true = enable
console.log(`Transaction fees enabled: ${await magaFox.transactionFeesEnabled()}`);

// Check balances before transfer with fees
const user1BalanceBefore = await magaFox.balanceOf(user1.address);
const charityWalletBalanceBefore = await magaFox.balanceOf(charityWallet.address);
console.log(`User1 balance before: ${ethers.formatEther(user1BalanceBefore)} tokens`);
console.log(`Charity wallet balance before: ${ethers.formatEther(charityWalletBalanceBefore)} tokens`);

// Transfer tokens with fees applied
await magaFox.connect(user2).transfer(user1.address, ethers.parseEther("1000"));

// Check balances after transfer with fees
const user1BalanceAfter = await magaFox.balanceOf(user1.address);
const charityWalletBalanceAfter = await magaFox.balanceOf(charityWallet.address);
console.log(`User1 balance after: ${ethers.formatEther(user1BalanceAfter)} tokens`);
console.log(`Charity wallet balance after: ${ethers.formatEther(charityWalletBalanceAfter)} tokens`);
console.log(`Charity wallet received: ${ethers.formatEther(charityWalletBalanceAfter - charityWalletBalanceBefore)} tokens`);
```

**Expected Output:**
```
Transaction fee set to: 200 basis points
Transaction fees enabled: true
User1 balance before: 0.0 tokens
Charity wallet balance before: 1000.0 tokens
User1 balance after: 980.0 tokens  // 1000 - 2% fee
Charity wallet balance after: 1010.0 tokens
Charity wallet received: 10.0 tokens  // Half of the 2% fee (1000 * 0.02 / 2)
```

#### 9. Testing Pausing Functionality

**Commands:**
```javascript
// Check initial pause state
const isPaused = await magaFox.paused();
console.log(`Contract is paused: ${isPaused}`);

// Pause the contract
await magaFox.setContractState(4, true); // 4 = Pause/Unpause, true = pause
console.log(`Contract is now paused: ${await magaFox.paused()}`);

// Try to transfer tokens while paused (should fail)
try {
  await magaFox.connect(user1).transfer(user2.address, ethers.parseEther("100"));
  console.log("Transfer succeeded while paused (this is incorrect behavior)");
} catch (error) {
  console.log("Transfer failed while paused (expected behavior)");
}

// Unpause the contract
await magaFox.setContractState(4, false); // 4 = Pause/Unpause, false = unpause
console.log(`Contract is now paused: ${await magaFox.paused()}`);

// Try to transfer tokens after unpausing
await magaFox.connect(user1).transfer(user2.address, ethers.parseEther("100"));
const user2BalanceAfterTransfer = await magaFox.balanceOf(user2.address);
console.log(`User2 balance after transfer: ${ethers.formatEther(user2BalanceAfterTransfer)} tokens`);
```

**Expected Output:**
```
Contract is paused: false
Contract is now paused: true
Transfer failed while paused (expected behavior)
Contract is now paused: false
User2 balance after transfer: 6100.0 tokens  // Previous balance (6000) + 100
```

#### 10. Testing Buyback Mechanism

**Commands:**
```javascript
// Mint some tokens to treasury for buyback
await magaFox.mintWithoutRestriction(owner.address, ethers.parseEther("100000"));
const treasuryBalanceBefore = await magaFox.balanceOf(owner.address);
console.log(`Treasury balance before buyback: ${ethers.formatEther(treasuryBalanceBefore)} tokens`);

// Get total supply before buyback
const totalSupplyBefore = await magaFox.totalSupply();
console.log(`Total supply before buyback: ${ethers.formatEther(totalSupplyBefore)} tokens`);

// Execute buyback
await magaFox.executeBuyback(ethers.parseEther("10000"));

// Check treasury balance after buyback
const treasuryBalanceAfter = await magaFox.balanceOf(owner.address);
console.log(`Treasury balance after buyback: ${ethers.formatEther(treasuryBalanceAfter)} tokens`);

// Check total supply after buyback
const totalSupplyAfter = await magaFox.totalSupply();
console.log(`Total supply after buyback: ${ethers.formatEther(totalSupplyAfter)} tokens`);
console.log(`Tokens burned: ${ethers.formatEther(totalSupplyBefore - totalSupplyAfter)} tokens`);
```

**Expected Output:**
```
Treasury balance before buyback: 100000.0 tokens
Total supply before buyback: 137100.0 tokens  // Sum of all minted tokens so far
Treasury balance after buyback: 90000.0 tokens
Total supply after buyback: 127100.0 tokens
Tokens burned: 10000.0 tokens
```

#### 11. Testing Tokenomics Locking

**Commands:**
```javascript
// Lock tokenomics
await magaFox.setContractState(3, true); // 3 = Lock tokenomics, true = lock
const charityFundAfterLock = await magaFox.charityFund();
console.log(`Tokenomics locked: ${charityFundAfterLock.locked}`);

// Try to update a locked tokenomics allocation (should fail)
try {
  // This would throw an error due to locked tokenomics
  await magaFox.updatePrivateSaleVesting(Math.floor(Date.now() / 1000), 30 * 24 * 60 * 60);
  console.log("Updated allocation after locking (incorrect behavior)");
} catch (error) {
  console.log("Failed to update allocation after locking (expected behavior)");
}
```

**Expected Output:**
```
Tokenomics locked: true
Failed to update allocation after locking (expected behavior)
```

#### 12. Testing Transfer Admin Role

**Commands:**
```javascript
// Check if user2 is admin before transfer
const isUser2AdminBefore = await magaFox.hasRole(DEFAULT_ADMIN_ROLE, user2.address);
console.log(`User2 is admin before transfer: ${isUser2AdminBefore}`);

// Transfer admin role to user2
await magaFox.transferAdminRole(user2.address);

// Check roles after transfer
const isOwnerAdminAfter = await magaFox.hasRole(DEFAULT_ADMIN_ROLE, owner.address);
const isUser2AdminAfter = await magaFox.hasRole(DEFAULT_ADMIN_ROLE, user2.address);
console.log(`Owner is admin after transfer: ${isOwnerAdminAfter}`);
console.log(`User2 is admin after transfer: ${isUser2AdminAfter}`);
```

**Expected Output:**
```
User2 is admin before transfer: false
Owner is admin after transfer: false
User2 is admin after transfer: true
```

## Common Issues and Troubleshooting

If you encounter errors while running these commands:

1. **TypeError: Cannot read properties of undefined**: Make sure you're using the correct ethers.js functions for your version. In newer versions, use `ethers.parseEther()` instead of `ethers.utils.parseEther()`.

2. **Error: cannot estimate gas**: This usually means there's an issue with the contract itself or you're trying to call a function with incorrect parameters.

3. **Error: Transaction reverted**: Check the specific error message - this often indicates you've hit one of the contract's custom errors like `InvalidInput` or `Unauthorized` or `ContractState`.

4. **Contract method not found**: Ensure you've deployed the correct contract version and that all functions match the contract code.

## Notes on Test Coverage

These tests cover:

- Basic token information and operations
- Role-based access control
- Vesting and release mechanisms
- Pausing functionality
- Admin operations
- Tokenomics locking
- Transaction fees
- Charity management
- Buyback mechanism

However, for a production deployment, consider adding tests for:
- Edge cases in vesting calculations
- Gas optimization testing
- Security audits and formal verification
- Integration with frontend applications

## License

MIT License