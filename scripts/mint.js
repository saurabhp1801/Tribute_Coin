const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Minting token from:", deployer.address);

  const contractAddress = "0x5f4B913BDB1F66732ac93bEb2ae45629f5dCb5B9";
  const contract = await ethers.getContractAt("MagaFox47", contractAddress);

  const recipient = "0x937DFaf1Bd2cC65D04159AfF1F0F08e2426D230E"; // ✅ Replace this
  const tokenId = 1;
  const tokenURI = "https://example.com/metadata/1.json"; // or IPFS URI

  const tx = await contract.mintToken(recipient, tokenId, tokenURI);
  await tx.wait();
  console.log("✅ Token minted to:", recipient);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
