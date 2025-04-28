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
  // Use empty addresses as placeholders
  const emptyAddress = "0x0000000000000000000000000000000000000000";
  const initialWallets = Array(8).fill(emptyAddress);
  
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
  
  // Setup wallet addresses after deployment....................................
  console.log("\nSetting up wallet addresses...");
  
  // Define your wallet addresses (using proper Ethereum addresses)
  const charityWallet = "0x937DFaf1Bd2cC65D04159AfF1F0F08e2426D230E";
  const teamAdvisorsWallet = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Use a different test address
  const developmentFundWallet = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // Use a different test address
  const communityRewardsWallet = "0x90F79bf6EB2c4f870365E785982E1f101E93b906"; // Use a different test address
  const liquidityPoolWallet = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"; // Use a different test address
  const treasuryWallet = "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"; // Use a different test address
  const privateSaleWallet = "0x976EA74026E726554dB657fA54763abd0C3a0aa9"; // Use a different test address
  const publicSaleWallet = "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955"; // Use a different test address
  
  // Allocate wallets in batches
  console.log("Allocating wallets...");
  try {
    const walletTypes = [0, 1, 2, 3, 4, 5, 6, 7]; // WalletType enum values
    const walletAddresses = [
      charityWallet,
      teamAdvisorsWallet,
      developmentFundWallet,
      communityRewardsWallet,
      liquidityPoolWallet,
      treasuryWallet,
      privateSaleWallet,
      publicSaleWallet
    ];
    
    await (await magaFox.allocateWallets(walletTypes, walletAddresses)).wait();
    console.log("All wallets allocated successfully");
  } catch (error) {
    console.error("Error allocating wallets:", error.message);
    // Try allocating one by one if batch allocation fails
    console.log("Trying to allocate wallets individually...");
    
    const walletsToAllocate = [
      { type: 0, address: charityWallet, name: "CHARITY_FUND" },
      { type: 1, address: teamAdvisorsWallet, name: "TEAM_ADVISORS" },
      { type: 2, address: developmentFundWallet, name: "DEVELOPMENT_FUND" },
      { type: 3, address: communityRewardsWallet, name: "COMMUNITY_REWARDS" },
      { type: 4, address: liquidityPoolWallet, name: "LIQUIDITY_POOL" },
      { type: 5, address: treasuryWallet, name: "TREASURY" },
      { type: 6, address: privateSaleWallet, name: "PRIVATE_SALE" },
      { type: 7, address: publicSaleWallet, name: "PUBLIC_SALE" }
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
  
  // Demonstrate private sale token distribution
  console.log("\n--- EXAMPLE: Private Sale Investor Distribution ---");
  
  // Example list of private sale investors
  const privateSaleInvestors = [
    { address: "0xBcd4042DE499D14e55001CcbB24a551F3b954096", amount: "5000000" },  // 5M tokens
    { address: "0x71bE63f3384f5fb98995898A86B02Fb2426c5788", amount: "10000000" }, // 10M tokens
  ];
  
  console.log("Distributing tokens to private sale investors (demonstration):");
  for (let i = 0; i < privateSaleInvestors.length; i++) {
    const investor = privateSaleInvestors[i];
    console.log(`Releasing ${investor.amount} tokens to investor ${i+1}: ${investor.address}`);
    
    try {
      // Convert to wei units (18 decimals)
      const amount = ethers.parseUnits(investor.amount, 18);
      // Use allocationType 3 for privateSale
      await (await magaFox.releaseTokens(3, investor.address, amount)).wait();
      console.log(`Success: Released ${investor.amount} tokens to investor ${i+1}`);
    } catch (error) {
      console.error(`Failed to release to investor ${i+1}: ${error.message}`);
    }
  }
  
  // Example: Release development funds
  try {
    const devAmount = ethers.parseUnits("1000000", 18); // 1M tokens
    console.log(`Releasing ${ethers.formatUnits(devAmount, 18)} tokens to development fund...`);
    // Use allocationType 2 for developmentFund
    await (await magaFox.releaseTokens(2, developmentFundWallet, devAmount)).wait();
    console.log("Development fund tokens released successfully");
  } catch (error) {
    console.error(`Failed to release development funds: ${error.message}`);
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