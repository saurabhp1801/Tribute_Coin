

// scripts/deploy-vesting.js  (ESM)
import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const tokenAddress = "0x728FCc07aCA99BF5E002a26B68251FC811480745";

  const Vesting = await hre.ethers.getContractFactory("MAGAFox47Vesting", deployer);
  const vesting = await Vesting.deploy(tokenAddress); // no deployer.address as extra arg
  await vesting.waitForDeployment();

  console.log("Vesting deployed at:", await vesting.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
