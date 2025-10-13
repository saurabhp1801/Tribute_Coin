import hre from "hardhat";
const { ethers } = hre;
import * as dotenv from "dotenv";
dotenv.config();

const zeros10 = () => new Array(10).fill(ethers.ZeroAddress);
const toWad = (n) => ethers.parseUnits(String(n), 18);

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with:", deployer.address);


  // === Deploy MagaFox47 Token ===
  const MagaFox47 = await ethers.getContractFactory("MagaFox47");
  const token = await MagaFox47.deploy(
    "MagaFox47",
    "MF47",
    toWad(1_000_000_000), // 1B tokens (tokenomics amount)
    "https://bafkreieonkqpkf26xqbyqnxpguzna6rizwndsdh4t35usjce5d5fhqc37q.ipfs.dweb.link/",
    []
  );
  await token.waitForDeployment();
  console.log("MagaFox47 deployed to:",  await token.getAddress());

  // === Deploy ProtocolFeeWallet ===
//   const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E"; // PancakeSwap Router (mainnet)
const routerAddress ="0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3"
  
  const charityWallet = "0x937DFaf1Bd2cC65D04159AfF1F0F08e2426D230E";   // your charity wallet
  const liquidityWallet = "0x976EA74026E726554dB657fA54763abd0C3a0aa9"; // your liquidity wallet
  const protocolWallet = "0xd3712e62B543C5f03211Cf3db216F3a747300258";  // your protocol wallet

  const ProtocolFeeWallet = await ethers.getContractFactory("ProtocolFeeWallet");
  const feeWallet = await ProtocolFeeWallet.deploy(
  await token.getAddress(),
  routerAddress,
  charityWallet,
  liquidityWallet,
  protocolWallet
);
  await feeWallet.waitForDeployment();
  console.log("ProtocolFeeWallet deployed to:", await token.getAddress());

  // === Link Fee Wallet in Token ===
  let tx = await token.setProtocolFeeWallet(await token.getAddress());
  await tx.wait();
  console.log("ProtocolFeeWallet linked to token.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
