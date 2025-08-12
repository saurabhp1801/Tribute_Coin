// // scripts/deploy-vesting.js (ESM version)

// import hardhat from "hardhat";
// const { ethers } = hardhat;
// async function main() {
//   const [deployer] = await ethers.getSigners();
//   console.log("Deploying Vesting Contract with account:", deployer.address);

//   const tokenAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Replace with real token address
//   const adminAddress = deployer.address;

//   const TokenVesting = await ethers.getContractFactory("TokenVesting");
//   const vestingContract = await TokenVesting.deploy(tokenAddress, adminAddress);

//   // Wait for deployment to be mined
//   await vestingContract.waitForDeployment();
//  console.log("✅ TokenVesting deployed to:", await vestingContract.getAddress());

// }

// main().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });



// import hre from "hardhat";

// async function main() {
//   const [deployer] = await hre.ethers.getSigners();

//   console.log("🚀 Deploying Vesting contract with account:", deployer.address);
//   console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

//   // ✅ Replace this with your deployed MagaFox token address
//   const tokenAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

//   // ✅ Get vesting contract factory
//   const Vesting = await hre.ethers.getContractFactory("TokenVesting");

//   // ✅ Deploy with both constructor arguments
//   const vesting = await Vesting.deploy(
//     tokenAddress,        // ERC20 token address
//     deployer.address     // admin address
//   );

//   await vesting.waitForDeployment();
//   console.log("✅ TokenVesting deployed to:", await vesting.getAddress());
// }

// main().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });



// // scripts/deploy-vesting.js
// import hardhat from "hardhat";
// const { ethers } = hardhat;

// async function main() {
//   const [deployer, admin, treasury] = await ethers.getSigners();
//   const token = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // your token address

//   const Vesting = await ethers.getContractFactory("MagaFox47Vesting");
//   const vesting = await Vesting.deploy(token, treasury.address, admin.address);
//   await vesting.waitForDeployment();

//   console.log("Vesting deployed:", await vesting.getAddress());
//   console.log("Admin:", admin.address);
//   console.log("Treasury:", treasury.address);

//   // fund (escrow)
//   // await (await tokenContract.approve(vesting.getAddress(), amount)).wait();
//   // await (await vesting.fund(amount)).wait();
// }

// main().catch((e) => { console.error(e); process.exit(1); });


// import hardhat from "hardhat";
// const { ethers } = hardhat;

// /**
//  * Run: npx hardhat run scripts/step1-deploy-and-create.js --network hardhat
//  * (or your network; this step doesn't need the MFX token address yet)
//  */
// async function main() {
//   const [deployer, admin, teamMember] = await ethers.getSigners();

//   const Vest = await ethers.getContractFactory("MFxVestingStep1");
//   const vest = await Vest.deploy(admin.address);
//   await vest.waitForDeployment();

//   console.log("Vesting step1:", await vest.getAddress());
//   console.log("Admin:", admin.address);
//   console.log("Team member (beneficiary):", teamMember.address);

//   // Example "TEAM_ADVISORS" style schedule:
//   const now = Math.floor(Date.now() / 1000);
//   const total = ethers.parseUnits("1000000", 18);   // 1,000,000 MFX
//   const start = BigInt(now);                        // TGE
//   const cliff = 365n * 24n * 60n * 60n;            // 12 months
//   const duration = 36n * 30n * 24n * 60n * 60n;    // 36 months linear (approx 30d/mo)
//   const tgeBps = 0;                                 // 0% at TGE for team
//   const revocable = true;

//   const tx = await vest.connect(admin).createSchedule(
//     teamMember.address,
//     total,
//     start,
//     cliff,
//     duration,
//     tgeBps,
//     revocable
//   );
//   await tx.wait();

//   const id = await vest.nextId();
//   const s = await vest.getSchedule(id);
//   console.log("Created schedule id:", id.toString());
//   console.log({
//     beneficiary: s.beneficiary,
//     total: s.total.toString(),
//     start: s.start.toString(),
//     cliff: s.cliff.toString(),
//     duration: s.duration.toString(),
//     tgeBps: s.tgeBps,
//   });
// }

// main().catch((e) => { console.error(e); process.exit(1); });



// // scripts/deploy-vesting-step1.js
// import hardhat from "hardhat";
// const { ethers } = hardhat;

// async function main() {
//   const [deployer, admin] = await ethers.getSigners();

//   console.log("Deploying with:", deployer.address);

//   const magaFoxTokenAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Replace with deployed MagaFox47 token address

//   const Vesting = await ethers.getContractFactory("MAGAFox47Vesting");
//   const vesting = await Vesting.deploy(admin.address, magaFoxTokenAddress);
//   await vesting.waitForDeployment();

//   console.log("MagaFox47Vesting deployed at:", await vesting.getAddress());
// }



// main().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });


// scripts/deploy-vesting.js  (ESM)
import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const tokenAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  const Vesting = await hre.ethers.getContractFactory("MAGAFox47Vesting", deployer);
  const vesting = await Vesting.deploy(tokenAddress); // no deployer.address as extra arg
  await vesting.waitForDeployment();

  console.log("Vesting deployed at:", await vesting.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
