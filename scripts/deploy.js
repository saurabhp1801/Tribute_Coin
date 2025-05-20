// scripts/deploy.js
import hardhat from "hardhat";
const { ethers } = hardhat;

async function main() {
  // Get the deployer's signer
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Token parameters
  const name = "MagaFox47";
  const symbol = "MFOX";
  const tokenImageURI = "https://bafybeigec2ma6y33riul6tk7ebhbppchqa23clwches772l5rlc5ggohpi.ipfs.nftstorage.link/";

  // 1 billion tokens with 18 decimals (same as ETH)
  const initialSupply = ethers.parseUnits("1000000000", 18);
  
  // Deploy the contract with empty wallets - we'll set them after deployment
  const initialWallets = [];
  
  // Deploy the contract
  const MagaFox47Factory = await ethers.getContractFactory("MagaFox47");
  const magaFox = await MagaFox47Factory.deploy(
    name,
    symbol,
    initialSupply,
    tokenImageURI,
    initialWallets
  );

  await magaFox.waitForDeployment();
  const deployedAddress = await magaFox.getAddress();
  
  console.log(`MagaFox47 token deployed to: ${deployedAddress}`);
  console.log(`Token Name: ${name}`);
  console.log(`Token Symbol: ${symbol}`);
  console.log(`Initial Supply: ${initialSupply.toString()} (${ethers.formatUnits(initialSupply, 18)} tokens)`);
  console.log(`Image URI: ${tokenImageURI}`);
  
  // Setup wallet addresses after deployment
  console.log("\nSetting up wallet addresses...");
  
  // Define your wallet addresses (using proper Ethereum addresses)
  // WalletType enum based on tests:
  // CHARITY_TREASURY: 0, SEED: 1, PRIVATE_STRATEGIC: 2, COMMUNITY_IDO: 3,
  // LIQUIDITY_AUCTION: 4, STAKING_REWARDS: 5, LIQUIDITY_MAKING: 6, TEAM_ADVISORS: 7,
  // GROWTH_PARTNERSHIPS: 8, FUTURE_DAO_RESERVE: 9
  const charityWallet = "0x937DFaf1Bd2cC65D04159AfF1F0F08e2426D230E";  // CHARITY_TREASURY
  const seedWallet = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";  // SEED
  const privateStrategicWallet = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";  // PRIVATE_STRATEGIC
  const communityIDOWallet = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";  // COMMUNITY_IDO
  const liquidityAuctionWallet = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65";  // LIQUIDITY_AUCTION
  const stakingRewardsWallet = "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc";  // STAKING_REWARDS
  const liquidityMakingWallet = "0x976EA74026E726554dB657fA54763abd0C3a0aa9";  // LIQUIDITY_MAKING
  const teamAdvisorsWallet = "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955";  // TEAM_ADVISORS
  const growthPartnershipsWallet = "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f";  // GROWTH_PARTNERSHIPS
  const futureDAOReserveWallet = "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720";  // FUTURE_DAO_RESERVE
  
  // Allocate wallets in batches
  console.log("Allocating wallets...");
  try {
    const walletTypes = [0, 1, 2, 3, 4, 5, 6, 7];
    const walletAddresses = [
      charityWallet,
      seedWallet,
      privateStrategicWallet,
      communityIDOWallet,
      liquidityAuctionWallet,
      stakingRewardsWallet,
      liquidityMakingWallet,
      teamAdvisorsWallet
    ];
    
    await (await magaFox.allocateWallets(walletTypes, walletAddresses)).wait();
    console.log("First batch of wallets allocated successfully");
    
    // Allocate additional wallets if needed
    const additionalWalletTypes = [8, 9];
    const additionalWalletAddresses = [
      growthPartnershipsWallet,
      futureDAOReserveWallet
    ];
    
    await (await magaFox.allocateWallets(additionalWalletTypes, additionalWalletAddresses)).wait();
    console.log("Second batch of wallets allocated successfully");
  } catch (error) {
    console.error("Error allocating wallets:", error.message);
    // Try allocating one by one if batch allocation fails
    console.log("Trying to allocate wallets individually...");
    
    const walletsToAllocate = [
      { type: 0, address: charityWallet, name: "CHARITY_TREASURY" },
      { type: 1, address: seedWallet, name: "SEED" },
      { type: 2, address: privateStrategicWallet, name: "PRIVATE_STRATEGIC" },
      { type: 3, address: communityIDOWallet, name: "COMMUNITY_IDO" },
      { type: 4, address: liquidityAuctionWallet, name: "LIQUIDITY_AUCTION" },
      { type: 5, address: stakingRewardsWallet, name: "STAKING_REWARDS" },
      { type: 6, address: liquidityMakingWallet, name: "LIQUIDITY_MAKING" },
      { type: 7, address: teamAdvisorsWallet, name: "TEAM_ADVISORS" },
      { type: 8, address: growthPartnershipsWallet, name: "GROWTH_PARTNERSHIPS" },
      { type: 9, address: futureDAOReserveWallet, name: "FUTURE_DAO_RESERVE" }
    ];
    
    for (const wallet of walletsToAllocate) {
      try {
        await (await magaFox.allocateWallets([wallet.type], [wallet.address])).wait();
        console.log(`Allocated ${wallet.name} wallet: ${wallet.address}`);
      } catch (innerError) {
        console.error(`Failed to allocate ${wallet.name} wallet:`, innerError.message);
      }
    }
  }
  
  // Add a sample charity
  console.log("\nAdding a sample charity...");
  const sampleCharity = "0x17F6AD8Ef982297579C203069C1DbfFE4348c372"; // Valid Ethereum address
  try {
    await (await magaFox.manageCharity(1, sampleCharity, "World Hunger Relief Fund")).wait();
    console.log(`Added charity: World Hunger Relief Fund (${sampleCharity})`);
  } catch (error) {
    console.error("Error adding charity:", error.message);
  }
  
  // Enable features
  console.log("\nEnabling contract features...");
  try {
    await (await magaFox.setContractState(1, true)).wait(); // Enable minting
    console.log("Minting enabled");
  } catch (error) {
    console.error("Error enabling minting:", error.message);
  }
  
  try {
    await (await magaFox.setContractState(2, true)).wait(); // Enable transaction fees
    console.log("Transaction fees enabled (default: 1%)");
  } catch (error) {
    console.error("Error enabling transaction fees:", error.message);
  }
  
  // Time travel to simulate vesting period (for testing purposes only - won't work on real networks)
  if (hardhat.network.name === "hardhat" || hardhat.network.name === "localhost") {
    console.log("\nSimulating time passage for vesting (only works on local networks)...");
    try {
      await ethers.provider.send("evm_increaseTime", [180 * 24 * 60 * 60]); // 180 days
      await ethers.provider.send("evm_mine", []);
      console.log("Time advanced by 180 days for testing");
    } catch (error) {
      console.error("Error advancing time:", error.message);
    }
  }
  
  // Demonstrate private strategic token distribution
  console.log("\n--- EXAMPLE: Private Strategic Investor Distribution ---");
  
  // Example list of private strategic investors
  const privateInvestors = [
    { address: "0xBcd4042DE499D14e55001CcbB24a551F3b954096", amount: "5000000" },  // 5M tokens
    { address: "0x71bE63f3384f5fb98995898A86B02Fb2426c5788", amount: "10000000" }, // 10M tokens
  ];
  
  console.log("Distributing tokens to private strategic investors (demonstration):");
  for (let i = 0; i < privateInvestors.length; i++) {
    const investor = privateInvestors[i];
    console.log(`Releasing ${investor.amount} tokens to investor ${i+1}: ${investor.address}`);
    
    try {
      // Convert to wei units (18 decimals)
      const amount = ethers.parseUnits(investor.amount, 18);
      // Using allocation type 2 for PRIVATE_STRATEGIC
      await (await magaFox.releaseTokens(2, investor.address, amount)).wait();
      
      console.log(`Success: Released ${investor.amount} tokens to investor ${i+1}`);
    } catch (error) {
      console.error(`Failed to release to investor ${i+1}: ${error.message}`);
      
      // If we're on a test network, try with a smaller amount
      if (hardhat.network.name === "hardhat" || hardhat.network.name === "localhost") {
        try {
          console.log("Trying with a smaller amount...");
          const smallerAmount = ethers.parseUnits("100000", 18); // 100K tokens
          await (await magaFox.releaseTokens(2, investor.address, smallerAmount)).wait();
          console.log(`Success: Released 100,000 tokens to investor ${i+1}`);
        } catch (innerError) {
          console.error(`Still failed with smaller amount: ${innerError.message}`);
        }
      }
    }
  }
  
  // Example: Release COMMUNITY_IDO funds which should have some available immediately
  try {
    const idoAmount = ethers.parseUnits("1000000", 18); // 1M tokens
    console.log(`\nReleasing ${ethers.formatUnits(idoAmount, 18)} tokens from COMMUNITY_IDO...`);
    // Use allocationType 3 for COMMUNITY_IDO
    await (await magaFox.releaseTokens(3, communityIDOWallet, idoAmount)).wait();
    console.log("COMMUNITY_IDO tokens released successfully");
  } catch (error) {
    console.error(`Failed to release COMMUNITY_IDO funds: ${error.message}`);
  }
  
  console.log("\nDeployment and initial setup complete!");
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });