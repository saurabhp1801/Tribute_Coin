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
// Hardhat Console Testing Commands for MagaFox47 Contract with Expected Outputs
// These commands are designed to be run sequentially in a Hardhat console

// =================== SETUP AND DEPLOYMENT ===================

// 1. Connect to the network and get signers
const [owner, addr1, addr2, charity1, charity2, seed, privateStrategic, communityIDO, liquidityAuction, stakingRewards, liquidityMaking, teamAdvisors, growthPartnerships, futureDaoReserve] = await ethers.getSigners();
console.log("Owner address:", await owner.getAddress());
// Expected output: Owner address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

// 2. Deploy the contract
const MagaFox47 = await ethers.getContractFactory("MagaFox47");
// Creating empty wallet array for constructor - we'll set these later
const initialWallets = Array(10).fill(ethers.ZeroAddress);
const totalSupply = ethers.parseEther("100000000"); // 100M supply
const magaFox = await MagaFox47.deploy(
  "MagaFox47", // name
  "MAGA47", // symbol
  totalSupply,  
  "https://example.com/token-image.png", // tokenImageURI
  initialWallets // Initial wallets (empty)
);
await magaFox.waitForDeployment();
const contractAddress = await magaFox.getAddress();
console.log("MagaFox47 contract deployed to:", contractAddress);
// Expected output: MagaFox47 contract deployed to: 0x...

// 3. Check initial tokenomics setup
console.log("Contract deployed successfully, checking initial setup");

// 4. Check the owner and role assignments
const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
const CHARITY_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CHARITY_ADMIN_ROLE"));

console.log("Is owner admin?", await magaFox.hasRole(DEFAULT_ADMIN_ROLE, owner.address));
// Expected output: Is owner admin? true
console.log("Is owner minter?", await magaFox.hasRole(MINTER_ROLE, owner.address));
// Expected output: Is owner minter? true
console.log("Is owner charity admin?", await magaFox.hasRole(CHARITY_ADMIN_ROLE, owner.address));
// Expected output: Is owner charity admin? true

// 5. Basic token information
console.log("Token name:", await magaFox.name());
// Expected output: Token name: MagaFox47
console.log("Token symbol:", await magaFox.symbol());
// Expected output: Token symbol: MAGA47
console.log("Token decimals:", await magaFox.decimals());
// Expected output: Token decimals: 18
console.log("Token image URI:", await magaFox.imageURI());
// Expected output: Token image URI: https://example.com/token-image.png

// 6. Check initial states
console.log("Is minting enabled?", await magaFox.isMintingEnabled());
// Expected output: Is minting enabled? false
console.log("Are transaction fees enabled?", await magaFox.transactionFeesEnabled());
// Expected output: Are transaction fees enabled? false
console.log("Transaction fee percent:", await magaFox.transactionFeePercent());
// Expected output: Transaction fee percent: 100 (1%)
console.log("Is contract paused?", await magaFox.paused());
// Expected output: Is contract paused? false

// =================== WALLET SETUP AND CHARITY MANAGEMENT ===================

// 7. Allocate wallets for the different allocation types
const walletTypes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // All wallet types from enum
const walletAddresses = [
  charity1.address, // CHARITY_TREASURY
  seed.address, // SEED
  privateStrategic.address, // PRIVATE_STRATEGIC
  communityIDO.address, // COMMUNITY_IDO
  liquidityAuction.address, // LIQUIDITY_AUCTION
  stakingRewards.address, // STAKING_REWARDS
  liquidityMaking.address, // LIQUIDITY_MAKING
  teamAdvisors.address, // TEAM_ADVISORS
  growthPartnerships.address, // GROWTH_PARTNERSHIPS
  futureDaoReserve.address // FUTURE_DAO_RESERVE
];

const allocateTx = await magaFox.allocateWallets(walletTypes, walletAddresses);
await allocateTx.wait();
console.log("Wallets allocated successfully");
// Expected output: Wallets allocated successfully

// 8. Check wallet allocations
for (let i = 0; i < walletTypes.length; i++) {
  const type = walletTypes[i];
  const assigned = await magaFox.allocatedWallets(type);
  const isAllocated = await magaFox.isWalletAllocated(type);
  console.log(`Wallet type ${type} allocated to ${assigned}, is allocated: ${isAllocated}`);
}
// Expected output: Multiple lines showing each wallet type, its address, and allocation status (true)

// 9. Add charities
const addCharity1Tx = await magaFox.manageCharity(1, charity1.address, "Charity One");
await addCharity1Tx.wait();
console.log("Charity One added successfully");
// Expected output: Charity One added successfully

const addCharity2Tx = await magaFox.manageCharity(1, charity2.address, "Charity Two");
await addCharity2Tx.wait();
console.log("Charity Two added successfully");
// Expected output: Charity Two added successfully

// 10. Check charity counts and details
const charityCount = await magaFox.getCharityCount();
console.log("Charity count:", charityCount);
// Expected output: Charity count: 2

const charity1Details = await magaFox.approvedCharities(charity1.address);
console.log("Charity 1 details:", {
  name: charity1Details.name,
  approved: charity1Details.approved,
  donated: charity1Details.donated
});
// Expected output: Shows name: "Charity One", approved: true, donated: 0

// =================== TOKEN MINTING ===================

// 11. Enable minting and try to mint tokens
await magaFox.setContractState(1, true); // Enable minting
console.log("Minting enabled:", await magaFox.isMintingEnabled());
// Expected output: Minting enabled: true

const mintTx = await magaFox.mint(addr1.address, ethers.parseEther("1000"), true);
await mintTx.wait();
console.log("Minted tokens to addr1");
// Expected output: Minted tokens to addr1

console.log("Addr1 balance:", ethers.formatEther(await magaFox.balanceOf(addr1.address)));
// Expected output: Addr1 balance: 1000.0
console.log("Has addr1 minted?", await magaFox.hasAddressMinted(addr1.address));
// Expected output: Has addr1 minted? true

// Try minting again with restriction - should fail
try {
  await magaFox.mint(addr1.address, ethers.parseEther("1000"), true);
  console.log("Second mint succeeded but should have failed");
} catch (error) {
  console.log("Second mint failed as expected due to address already minted");
  // Expected output: Second mint failed as expected due to address already minted
}

// Mint without restriction
const mint2Tx = await magaFox.mintWithoutRestriction(addr1.address, ethers.parseEther("1000"));
await mint2Tx.wait();
console.log("Minted additional tokens without restriction");
// Expected output: Minted additional tokens without restriction

console.log("Addr1 new balance:", ethers.formatEther(await magaFox.balanceOf(addr1.address)));
// Expected output: Addr1 new balance: 2000.0

// =================== TIME MANIPULATION FOR VESTING ===================

// Helper function to advance time
async function advanceTime(seconds) {
  await network.provider.send("hardhat_mine", [ethers.toBeHex(1)]);
  await network.provider.send("hardhat_setNextBlockTimestamp", [
    ethers.toBeHex(Math.floor(Date.now() / 1000) + seconds)
  ]);
  await network.provider.send("hardhat_mine", [ethers.toBeHex(1)]);
  console.log(`Time advanced by ${seconds} seconds (${seconds / 86400} days)`);
}

// =================== CHARITY DONATION ===================

// 12. First advance time by 1 year to unlock some charity allocation
console.log("Advancing time to unlock charity treasury allocation...");
await advanceTime(365 * 24 * 60 * 60); // 1 year
// Expected output: Time advanced by 31536000 seconds (365 days)

// Try charity donation
const donationAmount = ethers.parseEther("1000");
const donateTx = await magaFox.donateToCharity(charity1.address, donationAmount);
await donateTx.wait();
console.log("Donated to charity successfully");
// Expected output: Donated to charity successfully

console.log("Charity1 balance:", ethers.formatEther(await magaFox.balanceOf(charity1.address)));
// Expected output: Charity1 balance: 1000.0

// =================== TRANSACTION FEES ===================

// 13. Enable transaction fees and test transfers
await magaFox.setContractState(2, true); // Enable transaction fees
console.log("Transaction fees enabled:", await magaFox.transactionFeesEnabled());
// Expected output: Transaction fees enabled: true

// Connect as addr1 to make a transfer
const magaFoxAsAddr1 = magaFox.connect(addr1);
const transferAmount = ethers.parseEther("100");
const transferTx = await magaFoxAsAddr1.transfer(addr2.address, transferAmount);
await transferTx.wait();
console.log("Transfer completed with fees");
// Expected output: Transfer completed with fees

// Check balances after transfer
console.log("Addr1 balance after transfer:", ethers.formatEther(await magaFox.balanceOf(addr1.address)));
// Expected output: Lower than 1900.0 due to transfer + fees
console.log("Addr2 balance after transfer:", ethers.formatEther(await magaFox.balanceOf(addr2.address)));
// Expected output: 100.0
console.log("Charity treasury balance from fees:", ethers.formatEther(await magaFox.balanceOf(charity1.address)));
// Expected output: More than 1000.0 due to fee
console.log("Liquidity wallet balance from fees:", ethers.formatEther(await magaFox.balanceOf(liquidityMaking.address)));
// Expected output: Some value due to fee

// =================== VESTING TESTS ===================

// 14. Test token releases from vesting allocations 
// Advance time to release privateStrategic allocation (3 months cliff + some vesting)
console.log("Advancing time by 4 months to unlock privateStrategic allocation...");
await advanceTime(4 * 30 * 24 * 60 * 60); // 4 months
// Expected output: Time advanced by 10368000 seconds (120 days)

// Test release from privateStrategic (3 month cliff + 1 month vesting = ~1/9 unlocked)
const vestedAmount = ethers.parseEther("777777"); // Less than the total 7% allocation
const releaseStrategicTx = await magaFox.releaseTokens(2, privateStrategic.address, vestedAmount);
await releaseStrategicTx.wait();
console.log("Released privateStrategic tokens successfully");
// Expected output: Released privateStrategic tokens successfully

console.log("PrivateStrategic balance:", ethers.formatEther(await magaFox.balanceOf(privateStrategic.address)));
// Expected output: 777777.0

// Test release from community IDO which has 25% at TGE
const releaseCommunityTx = await magaFox.releaseTokens(3, communityIDO.address, ethers.parseEther("1000000"));
await releaseCommunityTx.wait();
console.log("Released community IDO tokens successfully");
// Expected output: Released community IDO tokens successfully

console.log("CommunityIDO balance:", ethers.formatEther(await magaFox.balanceOf(communityIDO.address)));
// Expected output: 1000000.0

// 15. Test DAO reserve release which doesn't check vesting
const releaseDaoTx = await magaFox.releaseTokens(9, futureDaoReserve.address, ethers.parseEther("1000000"));
await releaseDaoTx.wait();
console.log("Released DAO reserve tokens successfully");
// Expected output: Released DAO reserve tokens successfully

console.log("DAO reserve balance:", ethers.formatEther(await magaFox.balanceOf(futureDaoReserve.address)));
// Expected output: 1000000.0

// Release tokens from other allocations
// Advance time by 8 more months to unlock seed allocation (now we're at 1 year + 4 months)
console.log("Advancing time by 8 more months...");
await advanceTime(8 * 30 * 24 * 60 * 60); // 8 months
// Expected output: Time advanced by 20736000 seconds (240 days)

// Release from seed allocation (1 year cliff + 1/3 of vesting period)
const seedReleaseTx = await magaFox.releaseTokens(1, seed.address, ethers.parseEther("1666666"));
await seedReleaseTx.wait();
console.log("Released seed tokens successfully");
// Expected output: Released seed tokens successfully

console.log("Seed balance:", ethers.formatEther(await magaFox.balanceOf(seed.address)));
// Expected output: 1666666.0

// =================== BUYBACK AND BURN ===================

// 16. Test buyback and burn
// First mint some tokens to charity treasury to simulate having funds
await magaFox.mint(charity1.address, ethers.parseEther("10000"), false);
console.log("Charity treasury balance before buyback:", ethers.formatEther(await magaFox.balanceOf(charity1.address)));
// Expected output: Charity treasury balance before buyback: 11000.0 (1000 from donation + 10000 just minted)

// Execute buyback (contract burns tokens from charity treasury)
const buybackTx = await magaFox.executeBuyback(ethers.parseEther("1000"));
await buybackTx.wait();
console.log("Executed buyback successfully");
// Expected output: Executed buyback successfully

console.log("Charity treasury balance after buyback:", ethers.formatEther(await magaFox.balanceOf(charity1.address)));
// Expected output: Charity treasury balance after buyback: 10000.0

// =================== CONTRACT CONTROLS ===================

// 17. Test pausing the contract
await magaFox.setContractState(4, true); // Pause
console.log("Contract paused:", await magaFox.paused());
// Expected output: Contract paused: true

// Try to transfer while paused
try {
  await magaFoxAsAddr1.transfer(addr2.address, ethers.parseEther("10"));
  console.log("Transfer succeeded but should have failed due to pause");
} catch (error) {
  console.log("Transfer failed as expected due to contract being paused");
  // Expected output: Transfer failed as expected due to contract being paused
}

// Unpause
await magaFox.setContractState(4, false);
console.log("Contract unpaused:", await magaFox.paused());
// Expected output: Contract unpaused: false

// Try transfer again after unpausing
const transferAfterUnpauseTx = await magaFoxAsAddr1.transfer(addr2.address, ethers.parseEther("10"));
await transferAfterUnpauseTx.wait();
console.log("Transfer succeeded after unpausing");
// Expected output: Transfer succeeded after unpausing

// 18. Lock tokenomics
const lockTx = await magaFox.setContractState(3, true);
await lockTx.wait();
console.log("Tokenomics locked successfully");
// Expected output: Tokenomics locked successfully

// 19. Update token image URI
const newImageUri = "https://example.com/updated-token-image.png";
await magaFox.updateImageURI(newImageUri);
console.log("Updated token image URI:", await magaFox.imageURI());
// Expected output: Updated token image URI: https://example.com/updated-token-image.png

// 20. Transfer admin role
const newAdminTx = await magaFox.transferAdminRole(addr2.address);
await newAdminTx.wait();
console.log("Admin role transferred successfully");
// Expected output: Admin role transferred successfully

console.log("Is owner still admin?", await magaFox.hasRole(DEFAULT_ADMIN_ROLE, owner.address));
// Expected output: Is owner still admin? false
console.log("Is addr2 now admin?", await magaFox.hasRole(DEFAULT_ADMIN_ROLE, addr2.address));
// Expected output: Is addr2 now admin? true

// 21. Try to update settings as old admin (should fail)
try {
  await magaFox.setContractState(1, false); // Try to disable minting
  console.log("Setting update succeeded but should have failed");
} catch (error) {
  console.log("Setting update failed as expected due to lack of admin role");
  // Expected output: Setting update failed as expected due to lack of admin role
}

// 22. Try to update settings as new admin (should succeed)
const magaFoxAsAddr2 = magaFox.connect(addr2);
await magaFoxAsAddr2.setContractState(1, false); // Disable minting
console.log("Minting now enabled:", await magaFox.isMintingEnabled());
// Expected output: Minting now enabled: false

// 23. Remove charity as charity admin
const removeCharityTx = await magaFoxAsAddr2.manageCharity(2, charity1.address, "");
await removeCharityTx.wait();
console.log("Charity removed successfully");
// Expected output: Charity removed successfully

// 24. Verify charity was removed
const charityCountAfterRemoval = await magaFox.getCharityCount();
console.log("Charity count after removal:", charityCountAfterRemoval);
// Expected output: Charity count after removal: 1

const charity1DetailsAfterRemoval = await magaFox.approvedCharities(charity1.address);
console.log("Charity 1 details after removal:", {
  name: charity1DetailsAfterRemoval.name,
  approved: charity1DetailsAfterRemoval.approved,
  donated: charity1DetailsAfterRemoval.donated
});
// Expected output: Shows approved: false

// 25. Transfer remaining roles
await magaFoxAsAddr2.grantRole(MINTER_ROLE, addr1.address);
console.log("Minter role granted to addr1");
// Expected output: Minter role granted to addr1

await magaFoxAsAddr2.grantRole(CHARITY_ADMIN_ROLE, addr1.address);
console.log("Charity admin role granted to addr1");
// Expected output: Charity admin role granted to addr1

console.log("Is addr1 now a minter?", await magaFox.hasRole(MINTER_ROLE, addr1.address));
// Expected output: Is addr1 now a minter? true
console.log("Is addr1 now a charity admin?", await magaFox.hasRole(CHARITY_ADMIN_ROLE, addr1.address));
// Expected output: Is addr1 now a charity admin? true

// 26. Test revoking roles
await magaFoxAsAddr2.revokeRole(MINTER_ROLE, addr1.address);
console.log("Minter role revoked from addr1");
// Expected output: Minter role revoked from addr1

console.log("Is addr1 still a minter?", await magaFox.hasRole(MINTER_ROLE, addr1.address));
// Expected output: Is addr1 still a minter? false

// 27. Test final token balances and distribution
console.log("\n======= Final Token Distribution =======");
console.log("Owner balance:", ethers.formatEther(await magaFox.balanceOf(owner.address)));
console.log("Addr1 balance:", ethers.formatEther(await magaFox.balanceOf(addr1.address)));
console.log("Addr2 balance:", ethers.formatEther(await magaFox.balanceOf(addr2.address)));
console.log("Charity Treasury:", ethers.formatEther(await magaFox.balanceOf(charity1.address)));
console.log("Seed:", ethers.formatEther(await magaFox.balanceOf(seed.address)));
console.log("Private Strategic:", ethers.formatEther(await magaFox.balanceOf(privateStrategic.address)));
console.log("Community IDO:", ethers.formatEther(await magaFox.balanceOf(communityIDO.address)));
console.log("Liquidity Auction:", ethers.formatEther(await magaFox.balanceOf(liquidityAuction.address)));
console.log("Staking Rewards:", ethers.formatEther(await magaFox.balanceOf(stakingRewards.address)));
console.log("Liquidity Making:", ethers.formatEther(await magaFox.balanceOf(liquidityMaking.address)));
console.log("Team Advisors:", ethers.formatEther(await magaFox.balanceOf(teamAdvisors.address)));
console.log("Growth Partnerships:", ethers.formatEther(await magaFox.balanceOf(growthPartnerships.address)));
console.log("Future DAO Reserve:", ethers.formatEther(await magaFox.balanceOf(futureDaoReserve.address)));

// 28. Test token allocation details
console.log("\n======= Tokenomics Allocation Details =======");
const TOKEN_NAMES = [
  "Charity Treasury", "Seed", "Private Strategic", "Community IDO", "Liquidity Auction",
  "Staking Rewards", "Liquidity Making", "Team Advisors", "Growth Partnerships", "Future DAO Reserve"
];

// Helper function to get allocation by index
async function getTokenAllocationDetails(index) {
  // Mapping allocation index to the contract's storage slot (would need to be adjusted for actual contract)
  const targetFunction = {
    0: magaFox.charityTreasury,
    1: magaFox.seed,
    2: magaFox.privateStrategic,
    3: magaFox.communityIDO,
    4: magaFox.liquidityAuction,
    5: magaFox.stakingRewards,
    6: magaFox.liquidityMaking,
    7: magaFox.teamAdvisors,
    8: magaFox.growthPartnerships,
    9: magaFox.futureDaoReserve
  }[index];
  
  if (targetFunction) {
    try {
      const allocation = await targetFunction();
      return {
        totalAmount: ethers.formatEther(allocation.totalAmount),
        released: ethers.formatEther(allocation.released),
        startTime: new Date(Number(allocation.startTime) * 1000).toISOString(),
        duration: Number(allocation.duration) / (24 * 60 * 60), // Convert to days
        cliff: Number(allocation.cliff) / (24 * 60 * 60), // Convert to days
        locked: allocation.locked
      };
    } catch (error) {
      return "Function call failed - allocation might not be publicly accessible";
    }
  }
  return null;
}

// Try to get details for each allocation (might not work depending on contract visibility)
for (let i = 0; i < TOKEN_NAMES.length; i++) {
  try {
    const details = await getTokenAllocationDetails(i);
    console.log(`${TOKEN_NAMES[i]}:`, details);
  } catch (error) {
    console.log(`${TOKEN_NAMES[i]}: Unable to access details`);
  }
}

// 29. Check overall contract statistics
console.log("\n======= Contract Statistics =======");
console.log("Total supply:", ethers.formatEther(await magaFox.totalSupply()));
// Expected output: Total supply will be the sum of all minted tokens minus burns

// 30. Test additional contract features - like changing fee percentage
try {
  await magaFoxAsAddr2.setTransactionFeePercent(200); // Change to 2%
  console.log("Transaction fee updated to 2%");
  console.log("New transaction fee percent:", await magaFox.transactionFeePercent());
  // Expected output: New transaction fee percent: 200
} catch (error) {
  console.log("Failed to update transaction fee:", error.message);
}

// 31. Final transfer to test updated fees
const finalTransferTx = await magaFoxAsAddr1.transfer(addr2.address, ethers.parseEther("100"));
await finalTransferTx.wait();
console.log("Final transfer completed with updated fees");
// Expected output: Final transfer completed with updated fees

console.log("Final balances after all tests:");
console.log("Addr1 final balance:", ethers.formatEther(await magaFox.balanceOf(addr1.address)));
console.log("Addr2 final balance:", ethers.formatEther(await magaFox.balanceOf(addr2.address)));

console.log("\n======= Test Complete =======");
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