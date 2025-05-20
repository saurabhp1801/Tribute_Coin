# MagaFox47 Hardhat Testing Guide

This guide provides a comprehensive set of Hardhat console commands to test the MagaFox47 ERC20 token contract. Each section includes commands to run and their expected outputs, aligned with the current contract implementation.

## Prerequisites

- Node.js (v16+ recommended)
- Hardhat installed (`npm install --save-dev hardhat`)
- Required dependencies:
  ```bash
  npm install --save-dev @openzeppelin/contracts @nomiclabs/hardhat-ethers ethers
  ```

## Getting Started

1. Set up your Hardhat project
2. Place the MagaFox47 contract in your `contracts` directory
3. Start the Hardhat console:

```bash
npx hardhat console --network hardhat
```

## Test Commands

### 1. Setting Up Accounts and Deploying the Contract

```javascript
// Get test accounts
const [owner, user1, user2, charityWallet, liquidityWallet, stakingWallet, teamWallet, seedInvestor, privateInvestor, idoParticipant] = await ethers.getSigners();

// Get contract factory
const MagaFox47 = await ethers.getContractFactory("MagaFox47");

// Deploy contract with initial parameters
const totalSupply = ethers.parseEther("1000000000"); // 1 billion tokens
const tokenImageURI = "https://example.com/token-image.png";

// Set up initial wallets for all WalletType enums (0-9)
const initialWallets = [
  charityWallet.address,   // CHARITY_TREASURY (0)
  seedInvestor.address,    // SEED (1)
  privateInvestor.address, // PRIVATE_STRATEGIC (2)
  idoParticipant.address,  // COMMUNITY_IDO (3)
  liquidityWallet.address, // LIQUIDITY_AUCTION (4)
  stakingWallet.address,   // STAKING_REWARDS (5)
  liquidityWallet.address, // LIQUIDITY_MAKING (6)
  teamWallet.address,      // TEAM_ADVISORS (7)
  user1.address,           // GROWTH_PARTNERSHIPS (8)
  user2.address            // FUTURE_DAO_RESERVE (9)
];

// Deploy the contract
const magaFox = await MagaFox47.deploy(
  "MagaFox47", 
  "MAGA", 
  totalSupply, 
  tokenImageURI,
  initialWallets
);

// Wait for deployment
await magaFox.waitForDeployment();

// Get contract address
const magaFoxAddress = await magaFox.getAddress();
console.log("Contract deployed to:", magaFoxAddress);
```

Expected Output:
```
Contract deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### 2. Basic Contract Information

```javascript
// Get token name and symbol
const name = await magaFox.name();
const symbol = await magaFox.symbol();
console.log(`Token name: ${name}, Symbol: ${symbol}`);

// Get token image URI
const imageURI = await magaFox.imageURI();
console.log(`Token image URI: ${imageURI}`);

// Get total supply (should be 0 initially as tokens are in allocations)
const supply = await magaFox.totalSupply();
console.log(`Total supply: ${ethers.formatEther(supply)} tokens`);
```

Expected Output:
```
Token name: MagaFox47, Symbol: MAGA
Token image URI: https://example.com/token-image.png
Total supply: 0.0 tokens
```

### 3. Testing Role-Based Access Control

```javascript
// Check owner roles
const MINTER_ROLE = await magaFox.MINTER_ROLE();
const CHARITY_ADMIN_ROLE = await magaFox.CHARITY_ADMIN_ROLE();
const DEFAULT_ADMIN_ROLE = await magaFox.DEFAULT_ADMIN_ROLE();

const isOwnerAdmin = await magaFox.hasRole(DEFAULT_ADMIN_ROLE, owner.address);
const isOwnerMinter = await magaFox.hasRole(MINTER_ROLE, owner.address);
const isOwnerCharityAdmin = await magaFox.hasRole(CHARITY_ADMIN_ROLE, owner.address);
console.log(`Owner is admin: ${isOwnerAdmin}, Owner is minter: ${isOwnerMinter}, Owner is charity admin: ${isOwnerCharityAdmin}`);

// Grant roles to user1
await magaFox.grantRole(MINTER_ROLE, user1.address);
const isUser1Minter = await magaFox.hasRole(MINTER_ROLE, user1.address);
console.log(`User1 is minter: ${isUser1Minter}`);
```

Expected Output:
```
Owner is admin: true, Owner is minter: true, Owner is charity admin: true
User1 is minter: true
```

### 4. Testing Contract State Management

```javascript
// Check initial minting state
const isMintingEnabledBefore = await magaFox.isMintingEnabled();
console.log(`Minting enabled before: ${isMintingEnabledBefore}`);

// Enable minting
await magaFox.setContractState(1, true); // 1 = Minting status, true = enable
const isMintingEnabledAfter = await magaFox.isMintingEnabled();
console.log(`Minting enabled after: ${isMintingEnabledAfter}`);

// Check transaction fees
const txFeesEnabledBefore = await magaFox.transactionFeesEnabled();
const txFeePercent = await magaFox.transactionFeePercent();
console.log(`Transaction fees enabled: ${txFeesEnabledBefore}, Fee percent: ${txFeePercent} (${Number(txFeePercent)/100}%)`);

// Enable transaction fees
await magaFox.setContractState(2, true); // 2 = Transaction fees, true = enable
const txFeesEnabledAfter = await magaFox.transactionFeesEnabled();
console.log(`Transaction fees enabled after: ${txFeesEnabledAfter}`);

// Update transaction fee percent
await magaFox.setTransactionFeePercent(200); // 200 = 2%
const newTxFeePercent = await magaFox.transactionFeePercent();
console.log(`New transaction fee percent: ${newTxFeePercent} (${Number(newTxFeePercent)/100}%)`);
```

Expected Output:
```
Minting enabled before: false
Minting enabled after: true
Transaction fees enabled: false, Fee percent: 100 (1%)
Transaction fees enabled after: true
New transaction fee percent: 200 (2%)
```

### 5. Testing Wallet Allocation

```javascript
// Check initial wallet allocations
const charityWalletType = 0; // CHARITY_TREASURY
const liquidityMakingType = 6; // LIQUIDITY_MAKING

const charityWalletAddress = await magaFox.allocatedWallets(charityWalletType);
const isCharityWalletAllocated = await magaFox.isWalletAllocated(charityWalletType);
console.log(`Charity Treasury wallet allocated: ${isCharityWalletAllocated}`);
console.log(`Charity Treasury wallet address: ${charityWalletAddress}`);

const liquidityWalletAddress = await magaFox.allocatedWallets(liquidityMakingType);
const isLiquidityWalletAllocated = await magaFox.isWalletAllocated(liquidityMakingType);
console.log(`Liquidity Making wallet allocated: ${isLiquidityWalletAllocated}`);
console.log(`Liquidity Making wallet address: ${liquidityWalletAddress}`);

// Allocate new wallets
await magaFox.allocateWallets(
  [5, 8], // STAKING_REWARDS (5), GROWTH_PARTNERSHIPS (8)
  [user1.address, user2.address]
);

// Check new wallet allocations
const newStakingWalletAddress = await magaFox.allocatedWallets(5);
const newGrowthWalletAddress = await magaFox.allocatedWallets(8);
console.log(`New Staking Rewards wallet address: ${newStakingWalletAddress}`);
console.log(`New Growth Partnerships wallet address: ${newGrowthWalletAddress}`);
```

Expected Output:
```
Charity Treasury wallet allocated: true
Charity Treasury wallet address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Liquidity Making wallet allocated: true
Liquidity Making wallet address: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
New Staking Rewards wallet address: 0x90F79bf6EB2c4f870365E785982E1f101E93b906
New Growth Partnerships wallet address: 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
```

### 6. Testing Charity Management

```javascript
// Add a new charity
const newCharityAddress = user2.address;
const charityName = "Hunger Relief Foundation";

await magaFox.manageCharity(1, newCharityAddress, charityName); // 1 = Add charity
const charityInfo = await magaFox.approvedCharities(newCharityAddress);
console.log(`Charity name: ${charityInfo.name}, Approved: ${charityInfo.approved}, Donated: ${ethers.formatEther(charityInfo.donated)}`);

// Get charity count
const charityCount = await magaFox.getCharityCount();
console.log(`Number of approved charities: ${charityCount}`);

// Donate to charity (we need to enable minting first)
await magaFox.donateToCharity(newCharityAddress, ethers.parseEther("1000"));
const charityBalance = await magaFox.balanceOf(newCharityAddress);
const charityInfoAfterDonation = await magaFox.approvedCharities(newCharityAddress);
console.log(`Charity balance after donation: ${ethers.formatEther(charityBalance)} tokens`);
console.log(`Recorded donation: ${ethers.formatEther(charityInfoAfterDonation.donated)} tokens`);

// Remove a charity
await magaFox.manageCharity(2, newCharityAddress, ""); // 2 = Remove charity
const charityInfoAfterRemoval = await magaFox.approvedCharities(newCharityAddress);
console.log(`Charity approved after removal: ${charityInfoAfterRemoval.approved}`);

// Check charity count after removal
const charityCountAfterRemoval = await magaFox.getCharityCount();
console.log(`Number of approved charities after removal: ${charityCountAfterRemoval}`);
```

Expected Output:
```
Charity name: Hunger Relief Foundation, Approved: true, Donated: 0.0
Number of approved charities: 1
Charity balance after donation: 1000.0 tokens
Recorded donation: 1000.0 tokens
Charity approved after removal: false
Number of approved charities after removal: 0
```

### 7. Testing Minting

```javascript
// Check if user has minted before
const hasUser1Minted = await magaFox.hasAddressMinted(user1.address);
console.log(`Has user1 minted before: ${hasUser1Minted}`);

// Mint tokens with one-per-address restriction
await magaFox.mint(user1.address, ethers.parseEther("5000"), true);
const user1Balance = await magaFox.balanceOf(user1.address);
console.log(`User1 balance after mint: ${ethers.formatEther(user1Balance)} tokens`);

// Check if user has minted after
const hasUser1MintedAfter = await magaFox.hasAddressMinted(user1.address);
console.log(`Has user1 minted after: ${hasUser1MintedAfter}`);

// Try to mint again with one-per-address restriction (should fail)
let mintSucceeded = true;
try {
  await magaFox.mint(user1.address, ethers.parseEther("1000"), true);
} catch (error) {
  mintSucceeded = false;
  console.log("Second mint with restriction failed as expected");
}
console.log(`Second mint succeeded: ${mintSucceeded}`);

// Mint without restriction
await magaFox.mintWithoutRestriction(user1.address, ethers.parseEther("2000"));
const user1BalanceAfter = await magaFox.balanceOf(user1.address);
console.log(`User1 balance after unrestricted mint: ${ethers.formatEther(user1BalanceAfter)} tokens`);
```

Expected Output:
```
Has user1 minted before: false
User1 balance after mint: 5000.0 tokens
Has user1 minted after: true
Second mint with restriction failed as expected
Second mint succeeded: false
User1 balance after unrestricted mint: 7000.0 tokens
```

### 8. Testing Token Transfers and Fees

```javascript
// Mint tokens to user2 for testing transfers
await magaFox.mintWithoutRestriction(user2.address, ethers.parseEther("10000"));
const user2BalanceBefore = await magaFox.balanceOf(user2.address);
console.log(`User2 balance before transfer: ${ethers.formatEther(user2BalanceBefore)} tokens`);

// Check charity and liquidity wallet balances before transfer
const charityWalletBalanceBefore = await magaFox.balanceOf(charityWallet.address);
const liquidityWalletBalanceBefore = await magaFox.balanceOf(liquidityWallet.address);
console.log(`Charity wallet balance before: ${ethers.formatEther(charityWalletBalanceBefore)} tokens`);
console.log(`Liquidity wallet balance before: ${ethers.formatEther(liquidityWalletBalanceBefore)} tokens`);

// Transfer tokens with fees
await magaFox.connect(user2).transfer(user1.address, ethers.parseEther("1000"));

// Check balances after transfer
const user1BalanceAfterTransfer = await magaFox.balanceOf(user1.address);
const user2BalanceAfterTransfer = await magaFox.balanceOf(user2.address);
const charityWalletBalanceAfter = await magaFox.balanceOf(charityWallet.address);
const liquidityWalletBalanceAfter = await magaFox.balanceOf(liquidityWallet.address);

console.log(`User1 balance after transfer: ${ethers.formatEther(user1BalanceAfterTransfer)} tokens`);
console.log(`User2 balance after transfer: ${ethers.formatEther(user2BalanceAfterTransfer)} tokens`);
console.log(`Charity wallet balance after: ${ethers.formatEther(charityWalletBalanceAfter)} tokens`);
console.log(`Liquidity wallet balance after: ${ethers.formatEther(liquidityWalletBalanceAfter)} tokens`);

// Calculate fee amounts
const totalFee = ethers.parseEther("1000") * BigInt(200) / BigInt(10000); // 2% of 1000 tokens
const charityFee = totalFee / BigInt(2);
const liquidityFee = totalFee / BigInt(2);

console.log(`Total fee applied: ${ethers.formatEther(totalFee)} tokens`);
console.log(`Charity fee: ${ethers.formatEther(charityFee)} tokens`);
console.log(`Liquidity fee: ${ethers.formatEther(liquidityFee)} tokens`);
```

Expected Output:
```
User2 balance before transfer: 10000.0 tokens
Charity wallet balance before: 0.0 tokens
Liquidity wallet balance before: 0.0 tokens
User1 balance after transfer: 7980.0 tokens  // 7000 + 1000 - 20 (fee)
User2 balance after transfer: 9000.0 tokens  // 10000 - 1000
Charity wallet balance after: 10.0 tokens    // 0 + 10 (half of fee)
Liquidity wallet balance after: 10.0 tokens  // 0 + 10 (half of fee)
Total fee applied: 20.0 tokens
Charity fee: 10.0 tokens
Liquidity fee: 10.0 tokens
```

### 9. Testing Token Release from Allocations

```javascript
// Fast forward time to simulate vesting progress (30 days)
await network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
await network.provider.send("evm_mine");

// Check initial allocation balances
const privateBuyerBalanceBefore = await magaFox.balanceOf(privateInvestor.address);
console.log(`Private investor balance before: ${ethers.formatEther(privateBuyerBalanceBefore)} tokens`);

// Release tokens from private strategic allocation
await magaFox.releaseTokens(
  2,  // PRIVATE_STRATEGIC
  privateInvestor.address,
  ethers.parseEther("5000")
);

// Check balance after release
const privateBuyerBalanceAfter = await magaFox.balanceOf(privateInvestor.address);
console.log(`Private investor balance after release: ${ethers.formatEther(privateBuyerBalanceAfter)} tokens`);

// Try to release from community IDO allocation
await magaFox.releaseTokens(
  3,  // COMMUNITY_IDO
  idoParticipant.address,
  ethers.parseEther("10000")
);

// Check IDO participant balance
const idoParticipantBalance = await magaFox.balanceOf(idoParticipant.address);
console.log(`IDO participant balance: ${ethers.formatEther(idoParticipantBalance)} tokens`);

// Fast forward time more (1 year - to reach seed investor cliff)
await network.provider.send("evm_increaseTime", [335 * 24 * 60 * 60]); // 335 more days (365 total)
await network.provider.send("evm_mine");

// Release tokens from seed allocation after cliff
await magaFox.releaseTokens(
  1,  // SEED
  seedInvestor.address,
  ethers.parseEther("10000")
);

// Check seed investor balance
const seedInvestorBalance = await magaFox.balanceOf(seedInvestor.address);
console.log(`Seed investor balance after cliff: ${ethers.formatEther(seedInvestorBalance)} tokens`);
```

Expected Output:
```
Private investor balance before: 0.0 tokens
Private investor balance after release: 5000.0 tokens
IDO participant balance: 10000.0 tokens
Seed investor balance after cliff: 10000.0 tokens
```

### 10. Testing Buyback and Burn

```javascript
// Mint some tokens to owner for buyback testing
await magaFox.mintWithoutRestriction(owner.address, ethers.parseEther("50000"));
const ownerBalanceBefore = await magaFox.balanceOf(owner.address);
console.log(`Owner balance before buyback: ${ethers.formatEther(ownerBalanceBefore)} tokens`);

// Get total supply before buyback
const totalSupplyBefore = await magaFox.totalSupply();
console.log(`Total supply before buyback: ${ethers.formatEther(totalSupplyBefore)} tokens`);

// Execute buyback (assuming owner is the charity treasury wallet for this test)
// If not, we need to transfer tokens to the charity treasury wallet first
await magaFox.allocateWallets([0], [owner.address]); // Set owner as charity treasury
await magaFox.executeBuyback(ethers.parseEther("10000"));

// Check owner balance after buyback
const ownerBalanceAfter = await magaFox.balanceOf(owner.address);
console.log(`Owner balance after buyback: ${ethers.formatEther(ownerBalanceAfter)} tokens`);

// Check total supply after buyback
const totalSupplyAfter = await magaFox.totalSupply();
console.log(`Total supply after buyback: ${ethers.formatEther(totalSupplyAfter)} tokens`);
console.log(`Tokens burned: ${ethers.formatEther(totalSupplyBefore - totalSupplyAfter)} tokens`);
```

Expected Output:
```
Owner balance before buyback: 50000.0 tokens
Total supply before buyback: 83000.0 tokens
Owner balance after buyback: 40000.0 tokens
Total supply after buyback: 73000.0 tokens
Tokens burned: 10000.0 tokens
```

### 11. Testing Pausing Functionality

```javascript
// Check initial pause state
const isPaused = await magaFox.paused();
console.log(`Contract is paused: ${isPaused}`);

// Pause the contract
await magaFox.setContractState(4, true); // 4 = Pause/Unpause, true = pause
const isPausedAfter = await magaFox.paused();
console.log(`Contract is paused after: ${isPausedAfter}`);

// Try to transfer tokens while paused (should fail)
let transferSucceeded = true;
try {
  await magaFox.connect(user1).transfer(user2.address, ethers.parseEther("100"));
} catch (error) {
  transferSucceeded = false;
  console.log("Transfer failed while paused as expected");
}
console.log(`Transfer succeeded while paused: ${transferSucceeded}`);

// Unpause the contract
await magaFox.setContractState(4, false); // 4 = Pause/Unpause, false = unpause
const isPausedAfterUnpause = await magaFox.paused();
console.log(`Contract is paused after unpause: ${isPausedAfterUnpause}`);

// Try to transfer tokens after unpausing
await magaFox.connect(user1).transfer(user2.address, ethers.parseEther("100"));
const user2BalanceAfterUnpause = await magaFox.balanceOf(user2.address);
console.log(`User2 balance after transfer: ${ethers.formatEther(user2BalanceAfterUnpause)} tokens`);
```

Expected Output:
```
Contract is paused: false
Contract is paused after: true
Transfer failed while paused as expected
Transfer succeeded while paused: false
Contract is paused after unpause: false
User2 balance after transfer: 9098.0 tokens  // 9000 + 98 (100 - 2% fee)
```

### 12. Testing Tokenomics Locking

```javascript
// Check if tokenomics are locked before
const charityTreasury = await magaFox.charityTreasury();
console.log(`Charity treasury locked before: ${charityTreasury.locked}`);

// Lock tokenomics
await magaFox.setContractState(3, true); // 3 = Lock tokenomics, true = lock
const charityTreasuryAfter = await magaFox.charityTreasury();
console.log(`Charity treasury locked after: ${charityTreasuryAfter.locked}`);

// Check if other allocations are also locked
const seed = await magaFox.seed();
const privateStrategic = await magaFox.privateStrategic();
console.log(`Seed allocation locked: ${seed.locked}`);
console.log(`Private strategic allocation locked: ${privateStrategic.locked}`);
```

Expected Output:
```
Charity treasury locked before: false
Charity treasury locked after: true
Seed allocation locked: true
Private strategic allocation locked: true
```

### 13. Testing Admin Role Transfer

```javascript
// Check admin role before transfer
const isUser1AdminBefore = await magaFox.hasRole(DEFAULT_ADMIN_ROLE, user1.address);
console.log(`Is user1 admin before transfer: ${isUser1AdminBefore}`);

// Transfer admin role to user1
await magaFox.transferAdminRole(user1.address);

// Check admin roles after transfer
const isOwnerAdminAfter = await magaFox.hasRole(DEFAULT_ADMIN_ROLE, owner.address);
const isUser1AdminAfter = await magaFox.hasRole(DEFAULT_ADMIN_ROLE, user1.address);
console.log(`Is owner admin after transfer: ${isOwnerAdminAfter}`);
console.log(`Is user1 admin after transfer: ${isUser1AdminAfter}`);

// Try to grant roles with new admin
await magaFox.connect(user1).grantRole(CHARITY_ADMIN_ROLE, user2.address);
const isUser2CharityAdmin = await magaFox.hasRole(CHARITY_ADMIN_ROLE, user2.address);
console.log(`Is user2 charity admin: ${isUser2CharityAdmin}`);
```

Expected Output:
```
Is user1 admin before transfer: false
Is owner admin after transfer: false
Is user1 admin after transfer: true
Is user2 charity admin: true
```

## Troubleshooting Common Issues

1. **Gas Estimation Errors**: If you see "cannot estimate gas" errors, it often means the contract function is reverting. Check if you're hitting one of the custom errors like `Unauthorized`, `InvalidInput`, or `ContractState`.

2. **Transaction Reverts**: For specific error messages, ensure you're meeting all the requirements for each function:
   - Check that you have the correct role for the operation
   - Verify that the contract isn't paused when it shouldn't be
   - Ensure vesting periods are correct for token releases

3. **Function Not Found**: Double-check function names and parameters against the contract code.

4. **BigInt Conversion**: Make sure to use BigInt for large numbers when doing calculations, especially with fees.

5. **Hardhat Network Issues**: If time manipulation commands fail, ensure you're running on the Hardhat network and not a forked network.