// const hre = require("hardhat");

// async function main() {
//   const [deployer] = await hre.ethers.getSigners();
//   console.log("Deploying contracts with:", deployer.address);

//   // ===== 1. Deploy MagaFox47 token =====
//   const Token = await hre.ethers.getContractFactory("MagaFox47");
//   const token = await Token.deploy(
//     "MagaFox47",
//     "MFX47",
//     hre.ethers.utils.parseEther("1000000000"), // initial supply = 1B
//     "ipfs://tokenImageURI",
//     [] // initial wallets
//   );
//   await token.deployed();
//   console.log("MagaFox47 deployed at:", token.address);

//   // ===== 2. Deploy Vesting =====
//   const Vesting = await hre.ethers.getContractFactory("MagaFox47Vesting");
//   const vesting = await Vesting.deploy(token.address);
//   await vesting.deployed();
//   console.log("MagaFox47Vesting deployed at:", vesting.address);

//   // ===== 3. Deploy PreSellMagaFox =====
//   const PreSell = await hre.ethers.getContractFactory("PreSellMagaFox");
//   const vt = {
//     startDelay: 60, // 1 min
//     cliff: 60,      // 1 min cliff
//     duration: 3600, // 1 hour
//     slice: 60,      // vest every minute
//     revocable: false
//   };
//   const presale = await PreSell.deploy(
//     token.address,
//     vesting.address,
//     deployer.address,                 // treasury
//     hre.ethers.utils.parseEther("0.001"), // 1 token = 0.001 ETH
//     Math.floor(Date.now() / 1000),    // start now
//     Math.floor(Date.now() / 1000) + 86400, // end in 1 day
//     hre.ethers.utils.parseEther("100"), // hard cap = 100 ETH
//     hre.ethers.utils.parseEther("0.01"), // min per wallet
//     hre.ethers.utils.parseEther("10"),   // max per wallet
//     vt
//   );
//   await presale.deployed();
//   console.log("PreSellMagaFox deployed at:", presale.address);

//   // ===== 4. Setup permissions =====
//   await vesting.setLocker(presale.address, true);
//   console.log("Presale whitelisted as locker in vesting.");

//   // ===== 5. Fund presale with tokens =====
//   const amountForSale = hre.ethers.utils.parseEther("1000000"); // 1M tokens
//   await token.transfer(presale.address, amountForSale);
//   console.log("Presale funded with:", amountForSale.toString());

//   // ===== 6. Approve vesting =====
//   await presale.approveVesting(amountForSale);
//   console.log("Presale approved vesting for", amountForSale.toString());
// }

// main().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });


// scripts/deploy.js
// import { expect } from "chai";
// import pkg from "hardhat";

// async function main() {
//   const [deployer, treasury] = await ethers.getSigners();

//   console.log("Deploying contracts with:", deployer.address);

//   // Deploy token
//   const Token = await ethers.getContractFactory("MagaFox47");
//   const token = await Token.deploy(
//     "MagaFox47",
//     "MFX47",
//     ethers.utils.parseEther("1000000000"), // 1B supply
//     "uri",
//     []
//   );
//   await token.deployed();
//   console.log("Token deployed at:", token.address);

//   // Deploy vesting
//   const Vesting = await ethers.getContractFactory("MagaFox47Vesting");
//   const vesting = await Vesting.deploy(token.address);
//   await vesting.deployed();
//   console.log("Vesting deployed at:", vesting.address);

//   // Deploy presale
//   const vt = {
//     startDelay: 0,
//     cliff: 0,
//     duration: 3600, // 1 hr vesting (example)
//     slice: 60,
//     revocable: false,
//   };
//   const PreSell = await ethers.getContractFactory("PreSellMagaFox");
//   const presale = await PreSell.deploy(
//     token.address,
//     vesting.address,
//     treasury.address,
//     ethers.utils.parseEther("0.001"), // 1 token = 0.001 ETH
//     Math.floor(Date.now() / 1000) + 60, // start in 1 min
//     Math.floor(Date.now() / 1000) + 86400, // end in 1 day
//     ethers.utils.parseEther("10"), // hard cap 10 ETH
//     ethers.utils.parseEther("0.01"), // min 0.01 ETH
//     ethers.utils.parseEther("5"), // max 5 ETH
//     vt
//   );
//   await presale.deployed();
//   console.log("Presale deployed at:", presale.address);

//   // Set locker role in vesting
//   await vesting.setLocker(presale.address, true);

//   console.log("Deployment finished ✅");
// }

// main().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });



// scripts/deploy-presell.js
// import pkg from "hardhat";
// const { ethers } = pkg;

// async function main() {
//   const [deployer, treasury] = await ethers.getSigners();

//   console.log("Deploying contracts with:", deployer.address);

//   // Deploy token
//   const Token = await ethers.getContractFactory("MagaFox47");
//   const token = await Token.deploy(
//     "MagaFox47",
//     "MFX47",
//     ethers.parseEther("1000000000"), // 1B supply
//     "uri",
//     []
//   );
//   await token.waitForDeployment();
//   console.log("MagaFox Token deployed at:", await token.getAddress());

//   // Deploy vesting
//   const Vesting = await ethers.getContractFactory("MAGAFox47Vesting");
//   const vesting = await Vesting.deploy(await token.getAddress());
//   await vesting.waitForDeployment();
//   console.log("Vesting deployed at:", await vesting.getAddress());

//   // Vesting template
//   const vt = {
//     startDelay: 0,
//     cliff: 0,
//     duration: 3600, // 1 hr vesting
//     slice: 60,
//     revocable: false,
//   };

//   // Deploy presale
//   const PreSell = await ethers.getContractFactory("PreSellMagaFox");
//   const presale = await PreSell.deploy(
//     await token.getAddress(),
//     await vesting.getAddress(),
//     // treasury.address,
//     deployer.address,   //this need to be cahnged
//     ethers.parseEther("0.001"), // 1 token = 0.001 ETH
//     Math.floor(Date.now() / 1000) + 60, // start in 1 min
//     Math.floor(Date.now() / 1000) + 86400, // end in 1 day
//     ethers.parseEther("10"), // hard cap 10 ETH
//     ethers.parseEther("0.01"), // min 0.01 ETH
//     ethers.parseEther("5"), // max 5 ETH
//     vt
//   );
//   await presale.waitForDeployment();
//   console.log("Presale deployed at:", await presale.getAddress());

//   // Whitelist presale as locker in vesting (if needed)
//   // await vesting.setLocker(await presale.getAddress(), true);

//   console.log("✅ Deployment finished successfully");
// }

// main().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });
// import pkg from "hardhat";
// const { ethers } = pkg;

// const zeros10 = () => new Array(10).fill(ethers.ZeroAddress);

// async function main() {
//   const [owner,deployer, treasury] = await ethers.getSigners();

//   console.log("Deploying contracts with:", deployer.address);

//   // 1. Deploy token
//   // Deploy your real token
//   const Token = await ethers.getContractFactory("MagaFox47"); // <- exact name from your contract
//   const name = "MagaFox47";
//   const symbol = "MF47";
//   const initialSupplyForTokenomics = toWad(1_000_000_000); // used for tokenomics math only
//   const imageURI = "https://bafkreieonkqpkf26xqbyqnxpguzna6rizwndsdh4t35usjce5d5fhqc37q.ipfs.dweb.link/";
//   const initialWallets = zeros10();

//   const token = await Token.deploy(
//     name,
//     symbol,
//     initialSupplyForTokenomics,
//     imageURI,
//     initialWallets
//   );
//   await token.waitForDeployment();

// //   console.log("MagaFox Token deployed at:", await token.getAddress());

//   // Enable minting and mint actual ERC20 balance to owner (so vesting can pull)
//   await (await token.setContractState(1, true)).wait(); // 1 = enable minting
//   await (
//     await token.mintWithoutRestriction(owner.address, toWad(1_000_000_000))
//   ).wait();

//   // 2. Deploy vesting
//   const Vesting = await ethers.getContractFactory("MAGAFox47Vesting");
//   const vesting = await Vesting.deploy(await token.getAddress());
//   await vesting.waitForDeployment();
//   console.log("Vesting deployed at:", await vesting.getAddress());

//   // 3. Vesting template
//   const vt = {
//     startDelay: 0,
//     cliff: 0,
//     duration: 3600, // 1 hr vesting
//     slice: 60,
//     revocable: false,
//   };

//   // 4. Deploy presale
//   const PreSell = await ethers.getContractFactory("PreSellMagaFox");
//   const presale = await PreSell.deploy(
//     await token.getAddress(),
//     await vesting.getAddress(),
//     owner.address, // treasury wallet
//     ethers.parseEther("0.001"), // 1 token = 0.001 ETH
//     Math.floor(Date.now() / 1000) + 60, // start in 1 min
//     Math.floor(Date.now() / 1000) + 86400, // end in 1 day
//     ethers.parseEther("10"), // hard cap 10 ETH
//     ethers.parseEther("0.01"), // min 0.01 ETH
//     ethers.parseEther("5"), // max 5 ETH
//     vt
//   );
//   await presale.waitForDeployment();
//   console.log("Presale deployed at:", await presale.getAddress());

//   // 5. FUND Presale with tokens to sell
//   const tokensForSale = ethers.parseEther("1000000"); // 1M tokens for sale
//   await token.transfer(await presale.getAddress(), tokensForSale);
//   console.log("✅ Presale funded with tokens:", tokensForSale.toString());

//   // 6. Approve vesting contract to pull tokens from Presale
//   await presale.approveVesting(tokensForSale);
//   console.log("✅ Vesting approved to spend presale tokens");

//   console.log("🎉 Deployment finished successfully");
// }

// main().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });


import pkg from "hardhat";
const { ethers } = pkg;

const zeros10 = () => new Array(10).fill(ethers.ZeroAddress);
const toWad = (n) => ethers.parseUnits(String(n), 18);

async function main() {
  const [deployer] = await ethers.getSigners(); // ✅ only one signer on Sepolia
  console.log("Deploying contracts with:", deployer.address);

  // 1. Deploy token
  const Token = await ethers.getContractFactory("MagaFox47");
  const token = await Token.deploy(
    "MagaFox47",
    "MF47",
    toWad(1_000_000_000),
    "https://bafkreieonkqpkf26xqbyqnxpguzna6rizwndsdh4t35usjce5d5fhqc37q.ipfs.dweb.link/",
    zeros10()
  );
  await token.waitForDeployment();
  console.log("MagaFox Token deployed at:", await token.getAddress());

  // Enable minting & mint supply
  await (await token.setContractState(1, true)).wait();
  await (await token.mintWithoutRestriction(deployer.address, toWad(1_000_000_000))).wait();

  // 2. Deploy vesting
  const Vesting = await ethers.getContractFactory("MAGAFox47Vesting");
  const vesting = await Vesting.deploy(await token.getAddress());
  await vesting.waitForDeployment();
  console.log("Vesting deployed at:", await vesting.getAddress());

  // 3. Vesting template
  const vt = { startDelay: 0, cliff: 0, duration: 3600, slice: 60, revocable: false };

  // 4. Deploy presale
  const PreSell = await ethers.getContractFactory("PreSellMagaFox");
  const presale = await PreSell.deploy(
    await token.getAddress(),
    await vesting.getAddress(),
    deployer.address, // ✅ use deployer as treasury
    ethers.parseEther("0.001"),
    Math.floor(Date.now() / 1000) + 60,
    Math.floor(Date.now() / 1000) + 86400,
    ethers.parseEther("10"),
    ethers.parseEther("0.01"),
    ethers.parseEther("5"),
    vt
  );
  await presale.waitForDeployment();
  console.log("Presale deployed at:", await presale.getAddress());

  // 5. Fund presale
  const tokensForSale = ethers.parseEther("1000000");
  await token.transfer(await presale.getAddress(), tokensForSale);
  console.log("✅ Presale funded with tokens:", tokensForSale.toString());

  // 6. Approve vesting
  await presale.approveVesting(tokensForSale);
  console.log("✅ Vesting approved to spend presale tokens");

  console.log("🎉 Deployment finished successfully");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
