import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const [deployer] = await ethers.getSigners();

  const presaleAddress = "0xYourPresaleContractAddress"; // deployed presale
  const newTreasury = "0x1234567890abcdef1234567890abcdef12345678"; // Ron's wallet

  const PreSell = await ethers.getContractAt("PreSellMagaFox", presaleAddress);

  const tx = await PreSell.connect(deployer).setTreasury(newTreasury);
  await tx.wait();

  console.log("✅ Treasury updated to:", newTreasury);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});



//npx hardhat run scripts/setTreasury.js --network sepolia
