

// scripts/deploy-vesting.js  (ESM)
import hre from "hardhat";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const tokenAddress = process.env.TOKEN_ADDRESS;
  if (!tokenAddress) {
    throw new Error("❌ TOKEN_ADDRESS is not defined in .env");
  }

    // set whether owner can adjust vesting time after deployment
  const canAdjustTime = true; // set to false if you want it immutable after deployment

  const Vesting = await hre.ethers.getContractFactory("MAGAFox47Vesting", deployer);
  const vesting = await Vesting.deploy(tokenAddress,canAdjustTime); // no deployer.address as extra arg
  await vesting.waitForDeployment();

  console.log("Vesting deployed at:", await vesting.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
