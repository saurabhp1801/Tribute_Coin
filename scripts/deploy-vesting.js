

// scripts/deploy-vesting.js  (ESM)
import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const tokenAddress = "0x610178dA211FEF7D417bC0e6FeD39F05609AD788";

  const Vesting = await hre.ethers.getContractFactory("MAGAFox47Vesting", deployer);
  const vesting = await Vesting.deploy(tokenAddress); // no deployer.address as extra arg
  await vesting.waitForDeployment();

  console.log("Vesting deployed at:", await vesting.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
