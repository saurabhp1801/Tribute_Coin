import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const presaleAddress = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
  const presaleAbi = [];

  const [signer] = await ethers.getSigners();
  const presale = new ethers.Contract(presaleAddress, presaleAbi, signer);

  const start = await presale.saleStart();
  const end = await presale.saleEnd();
  console.log("📌 Sale times:", {
    start: start.toString(),
    end: end.toString(),
  });
}

main().catch(console.error);
