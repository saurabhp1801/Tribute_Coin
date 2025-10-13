// scripts/deploy-all.js
import hre from "hardhat";
import dotenv from "dotenv";
dotenv.config();

const { ethers } = hre;

// Helper: Convert number to 18-decimal token units
const toWad = (n) => ethers.parseUnits(String(n), 18);
const zeros10 = () => new Array(10).fill(ethers.ZeroAddress);

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=========================================================");
  console.log("🚀 Deploying all contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());
  console.log("=========================================================\n");

  // -----------------------------
  // 1️⃣ Deploy MagaFox47 Token
  // -----------------------------
  const tokenName = "MagaFox47";
  const tokenSymbol = "MFOX";
  const tokenImageURI = "https://bafkreieonkqpkf26xqbyqnxpguzna6rizwndsdh4t35usjce5d5fhqc37q.ipfs.dweb.link/";
  const initialSupply = toWad(1_000_000_000); // 1 billion tokens

// Deploy the contract with empty wallets - we'll set them after deployment
const initialWallets = [];
  
// Deploy the contract
  const MagaFox47Factory = await ethers.getContractFactory("MagaFox47");
  const token = await MagaFox47Factory.deploy(tokenName, tokenSymbol, initialSupply, tokenImageURI, zeros10());
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

 
  console.log(`MagaFox47 token at: ${tokenAddress}`);
  console.log(`Token Name: ${tokenName}`);
  console.log(`Token Symbol: ${tokenSymbol}`);
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
  const ownersAllocationWallet = "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955";  // OWNERS_ALLOCATION
  const growthPartnershipsWallet = "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f";  // GROWTH_PARTNERSHIPS
  const futureDAOReserveWallet = "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720";  // FUTURE_DAO_RESERVE
  
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
      ownersAllocationWallet      
    ];
    
    await (await token.allocateWallets(walletTypes, walletAddresses)).wait();
    console.log("First batch of wallets allocated successfully");
    
    // Allocate additional wallets if needed
    const additionalWalletTypes = [8, 9];
    const additionalWalletAddresses = [
      growthPartnershipsWallet,
      futureDAOReserveWallet
    ];
    
    await (await token.allocateWallets(additionalWalletTypes, additionalWalletAddresses)).wait();
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
      { type: 7, address: ownersAllocationWallet, name: "OWNERS_ALLOCATION" },     
      { type: 8, address: growthPartnershipsWallet, name: "GROWTH_PARTNERSHIPS" },
      { type: 9, address: futureDAOReserveWallet, name: "FUTURE_DAO_RESERVE" }
    ];
    
    for (const wallet of walletsToAllocate) {
      try {
        await (await token.allocateWallets([wallet.type], [wallet.address])).wait();
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
    await (await token.manageCharity(1, sampleCharity, "World Hunger Relief Fund")).wait();
    console.log(`Added charity: World Hunger Relief Fund (${sampleCharity})`);
  } catch (error) {
    console.error("Error adding charity:", error.message);
  }
  
  
  // Enable minting feature
  // Enable features
  console.log("\nEnabling contract features...");
  try {
    await (await token.setContractState(1, true)).wait(); // Enable minting
    await (await token.mintWithoutRestriction(deployer.address, toWad(1_000_000_000))).wait();
    console.log("Minting enabled");
  } catch (error) {
    console.error("Error enabling minting:", error.message);
  }
  

try {
    await (await token.setContractState(2, true)).wait(); // Enable transaction fees
    console.log("Transaction fees enabled (default: 1%)");
  } catch (error) {
    console.error("Error enabling transaction fees:", error.message);
  }
  
  
  console.log("\nDeployment and initial setup complete!");



  // -----------------------------
  // 2️⃣ Deploy Vesting Contract
  // -----------------------------
  const canAdjustTime = true;
  const Vesting = await ethers.getContractFactory("MAGAFox47Vesting",deployer);
  const vesting = await Vesting.deploy(tokenAddress, canAdjustTime);
  await vesting.waitForDeployment();
  const vestingAddress = await vesting.getAddress();

  console.log(`✅ Vesting contract deployed at: ${vestingAddress}\n`);





  // -----------------------------
  // 3️⃣ Deploy Presale Contract
  // -----------------------------
  const now = Math.floor(Date.now() / 1000);
  const saleStart = now + 60 * 60;       // start in 1 hour
  const saleEnd = now + 3 * 24 * 60 * 60; // end after 3 days
  const hardCapTokens = toWad(1_000_000); // 1 million tokens available for sale
  const minPerWallet = toWad(100);
  const maxPerWallet = toWad(10_000);
  const treasury = deployer.address;

  // rate = tokens per 1 ETH (100 tokens per ETH in this example)
  const tokensPerEth = BigInt(process.env.TOKENS_PER_ETH); // from .env
  console.log("🚀 ~ main ~ tokensPerEth:", tokensPerEth)
  const ratePerEth = ethers.parseUnits(String(tokensPerEth), 18); // 100 * 1e18
  console.log("🚀 ~ main ~ ratePerEth:", ratePerEth)
  //const ratePerEth = ethers.parseUnits("100", 18);

  // VestingTemplate: startDelay, cliff, duration, slice, revocable
  const vestingTemplate = [0, 0, 3600 * 24 * 30, 86400, false]; // 30 days linear vesting

  const PreSellMagaFox = await ethers.getContractFactory("PreSellMagaFox");
  const presale = await PreSellMagaFox.deploy(
    tokenAddress,
    vestingAddress,
    treasury,
    ratePerEth,
    saleStart,
    saleEnd,
    hardCapTokens,
    minPerWallet,
    maxPerWallet,
    vestingTemplate
  );
  await presale.waitForDeployment();
  const presaleAddress = await presale.getAddress();
  console.log(`✅ Presale contract deployed at: ${presaleAddress}`);

  // Transfer tokens to presale contract
  const saleSupply = toWad(1_000_000);
  await (await token.transfer(presaleAddress, saleSupply)).wait();
  console.log(`✅ Funded presale contract with ${ethers.formatUnits(saleSupply, 18)} tokens`);

  // Approve vesting from presale
  await (await presale.approveVesting(saleSupply)).wait();
  console.log("✅ Approved vesting allowance for presale contract\n");

  // -----------------------------
  // 4️⃣ Deploy ProtocolFeeWallet
  // -----------------------------
  const routerAddress = "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3"; // PancakeSwap router (BSC testnet)
//   const charityWallet = "0x937DFaf1Bd2cC65D04159AfF1F0F08e2426D230E";
  const liquidityWallet = "0x976EA74026E726554dB657fA54763abd0C3a0aa9";
  const protocolWallet = "0xd3712e62B543C5f03211Cf3db216F3a747300258";

  const ProtocolFeeWallet = await ethers.getContractFactory("ProtocolFeeWallet");
  const feeWallet = await ProtocolFeeWallet.deploy(
    tokenAddress,
    routerAddress,
    charityWallet,
    liquidityWallet,
    protocolWallet
  );
  await feeWallet.waitForDeployment();
  const feeWalletAddress = await feeWallet.getAddress();
  console.log(`✅ ProtocolFeeWallet deployed at: ${feeWalletAddress}`);

  // Link fee wallet to token
  await (await token.setProtocolFeeWallet(feeWalletAddress)).wait();
  console.log("✅ ProtocolFeeWallet linked with token\n");

  // -----------------------------
  // 5️⃣ Deployment Summary
  // -----------------------------
  console.log("=========================================================");
  console.log("🎯 DEPLOYMENT COMPLETE!");
  console.log("=========================================================");
  console.log(`Token (MagaFox47):         ${tokenAddress}`);
  console.log(`Vesting (MAGAFox47Vesting): ${vestingAddress}`);
  console.log(`Presale (PreSellMagaFox):  ${presaleAddress}`);
  console.log(`ProtocolFeeWallet:         ${feeWalletAddress}`);
  console.log("=========================================================\n");

  // Optional: Save addresses in JSON for later frontend/backend use
  const fs = await import("fs");
  const deploymentData = {
    tokenAddress,
    vestingAddress,
    presaleAddress,
    feeWalletAddress,
    deployer: deployer.address,
    network: hre.network.name,
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync("deployment-output.json", JSON.stringify(deploymentData, null, 2));
  console.log("📝 Deployment data saved to deployment-output.json");
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });