// scripts/verify.js
import hardhat from "hardhat";
const { ethers, run } = hardhat;

async function main() {
  // Replace with the actual deployed contract address
  const contractAddress = "0x4A8d58B8E45738260Cd5D1c91D505Df2C43f1A6a";

  // These arguments should match the ones used during deployment
  const tokenName = "MagaFox47";
  const tokenSymbol = "MFOX";
  const initialSupply = ethers.parseUnits("1000000000", 18);
  const imageURI = "https://bafybeigec2ma6y33riul6tk7ebhbppchqa23clwches772l5rlc5ggohpi.ipfs.nftstorage.link/";
  const charityWallet = "0x937DFaf1Bd2cC65D04159AfF1F0F08e2426D230E";

  console.log("Verifying contract on Etherscan...");

  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [
        tokenName,
        tokenSymbol,
        initialSupply,
        imageURI,
        charityWallet
      ],
    });
    console.log("Contract verified successfully!");
  } catch (error) {
    console.error("Verification failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
