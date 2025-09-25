// // test/PreSellMagaFox.js
// import { expect } from "chai";
// import pkg from "hardhat";
// const { ethers } = pkg;
// describe("PreSellMagaFox", function () {
//   let token, vesting, presale;
//   let owner, user1, user2, treasury;

//   beforeEach(async () => {
//     [owner, user1, user2, treasury] = await ethers.getSigners();

//     // Deploy Token
//     const Token = await ethers.getContractFactory("MagaFox47");
//     token = await Token.deploy(
//       "MagaFox47",
//       "MFX47",
//       ethers.utils.parseEther("1000000000"),
//       "uri",
//       []
//     );

//     // Deploy Vesting
//     const Vesting = await ethers.getContractFactory("MagaFox47Vesting");
//     vesting = await Vesting.deploy(token.address);

//     // Deploy Presale
//     const vt = {
//       startDelay: 0,
//       cliff: 0,
//       duration: 3600,
//       slice: 60,
//       revocable: false
//     };
//     const PreSell = await ethers.getContractFactory("PreSellMagaFox");
//     presale = await PreSell.deploy(
//       token.address,
//       vesting.address,
//       treasury.address,
//       ethers.utils.parseEther("0.001"),
//       Math.floor(Date.now() / 1000) - 10,
//       Math.floor(Date.now() / 1000) + 86400,
//       ethers.utils.parseEther("10"),
//       ethers.utils.parseEther("0.01"),
//       ethers.utils.parseEther("5"),
//       vt
//     );

//     await vesting.setLocker(presale.address, true);

//     // Fund presale
//     const tokensForSale = ethers.utils.parseEther("1000000");
//     await token.transfer(presale.address, tokensForSale);
//     await presale.approveVesting(tokensForSale);
//   });

//   it("should allow user to buy tokens and create vesting schedule", async () => {
//     const weiToSpend = ethers.utils.parseEther("0.1");
//     await expect(presale.connect(user1).buy(user1.address, { value: weiToSpend }))
//       .to.emit(presale, "Purchased");

//     expect(await presale.userSpentWei(user1.address)).to.equal(weiToSpend);
//     expect(await presale.totalRaisedWei()).to.equal(weiToSpend);
//   });

//   it("should enforce min and max per wallet", async () => {
//     await expect(
//       presale.connect(user1).buy(user1.address, { value: ethers.utils.parseEther("0.001") })
//     ).to.be.revertedWith("AmountTooSmall");

//     await expect(
//       presale.connect(user1).buy(user1.address, { value: ethers.utils.parseEther("6") })
//     ).to.be.revertedWith("AmountTooLarge");
//   });

//   it("should not exceed hard cap", async () => {
//     await presale.connect(user1).buy(user1.address, { value: ethers.utils.parseEther("5") });
//     await expect(
//       presale.connect(user2).buy(user2.address, { value: ethers.utils.parseEther("6") })
//     ).to.be.revertedWith("CapExceeded");
//   });

//   it("should forward raised funds to treasury", async () => {
//     const before = await ethers.provider.getBalance(treasury.address);
//     await presale.connect(user1).buy(user1.address, { value: ethers.utils.parseEther("1") });
//     const after = await ethers.provider.getBalance(treasury.address);
//     expect(after.sub(before)).to.equal(ethers.utils.parseEther("1"));
//   });

//   it("should respect whitelist if enabled", async () => {
//     await presale.setWhitelistEnabled(true);
//     await expect(
//       presale.connect(user1).buy(user1.address, { value: ethers.utils.parseEther("1") })
//     ).to.be.revertedWith("NotWhitelisted");

//     await presale.setWhitelist([user1.address], true);
//     await expect(presale.connect(user1).buy(user1.address, { value: ethers.utils.parseEther("1") }))
//       .to.emit(presale, "Purchased");
//   });
// });

// // test/PreSellMagaFox.js
// import { expect } from "chai";
// import pkg from "hardhat";
// const { ethers } = pkg;
// const zeros10 = () => new Array(10).fill(ethers.ZeroAddress);
// describe("PreSellMagaFox", function () {
//   let token, vesting, presale;
//   let owner, user1, user2, treasury;

//   beforeEach(async () => {
//     [owner, user1, user2, treasury] = await ethers.getSigners();

//     // Deploy Token
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

//    await token.waitForDeployment();

//   // Enable minting and mint actual ERC20 balance to owner (so vesting can pull)
//   await (await token.setContractState(1, true)).wait(); // 1 = enable minting
//   await (
//     await token.mintWithoutRestriction(owner.address, toWad(1_000_000_000))
//   ).wait();

//     // Deploy Vesting
//     const Vesting = await ethers.getContractFactory("MAGAFox47Vesting"); // ✅ make sure name matches your .sol file
//     vesting = await Vesting.deploy(await token.getAddress());

//     // Deploy Presale
//     const vt = {
//       startDelay: 0,
//       cliff: 0,
//       duration: 3600,
//       slice: 60,
//       revocable: false
//     };
//     const PreSell = await ethers.getContractFactory("PreSellMagaFox");
//     presale = await PreSell.deploy(
//       await token.getAddress(),
//       await vesting.getAddress(),
//       treasury.address,
//       ethers.parseEther("0.001"), // ✅ fixed here
//       Math.floor(Date.now() / 1000) - 10,
//       Math.floor(Date.now() / 1000) + 86400,
//       ethers.parseEther("10"), // ✅ fixed here
//       ethers.parseEther("0.01"), // ✅ fixed here
//       ethers.parseEther("5"), // ✅ fixed here
//       vt
//     );

//     // Fund presale
//     const tokensForSale = ethers.parseEther("1000000"); // ✅ fixed here
//     await token.transfer(await presale.getAddress(), tokensForSale);
//     await presale.approveVesting(tokensForSale);
//   });

//   it("should allow user to buy tokens and create vesting schedule", async () => {
//     const weiToSpend = ethers.parseEther("0.1"); // ✅ fixed
//     await expect(presale.connect(user1).buy(user1.address, { value: weiToSpend }))
//       .to.emit(presale, "Purchased");

//     expect(await presale.userSpentWei(user1.address)).to.equal(weiToSpend);
//     expect(await presale.totalRaisedWei()).to.equal(weiToSpend);
//   });

//   it("should enforce min and max per wallet", async () => {
//     await expect(
//       presale.connect(user1).buy(user1.address, { value: ethers.parseEther("0.001") })
//     ).to.be.revertedWithCustomError(presale, "AmountTooSmall"); // ✅ v6 throws custom errors

//     await expect(
//       presale.connect(user1).buy(user1.address, { value: ethers.parseEther("6") })
//     ).to.be.revertedWithCustomError(presale, "AmountTooLarge"); // ✅
//   });

//   it("should not exceed hard cap", async () => {
//     await presale.connect(user1).buy(user1.address, { value: ethers.parseEther("5") });
//     await expect(
//       presale.connect(user2).buy(user2.address, { value: ethers.parseEther("6") })
//     ).to.be.revertedWithCustomError(presale, "CapExceeded"); // ✅
//   });

//   it("should forward raised funds to treasury", async () => {
//     const before = await ethers.provider.getBalance(treasury.address);
//     await presale.connect(user1).buy(user1.address, { value: ethers.parseEther("1") });
//     const after = await ethers.provider.getBalance(treasury.address);
//     expect(after - before).to.equal(ethers.parseEther("1"));
//   });

//   it("should respect whitelist if enabled", async () => {
//     await presale.setWhitelistEnabled(true);
//     await expect(
//       presale.connect(user1).buy(user1.address, { value: ethers.parseEther("1") })
//     ).to.be.revertedWithCustomError(presale, "NotWhitelisted"); // ✅

//     await presale.setWhitelist([user1.address], true);
//     await expect(presale.connect(user1).buy(user1.address, { value: ethers.parseEther("1") }))
//       .to.emit(presale, "Purchased");
//   });
// });

// ========================================

// import { expect } from "chai";
// import pkg from "hardhat";
// const { ethers } = pkg;

// function toWad(n) {
//   return ethers.parseUnits(String(n), 18);
// }

// const zeros10 = () => new Array(10).fill(ethers.ZeroAddress);

// describe("PreSellMagaFox", function () {
//   let token, vesting, presale;
//   let owner, user1, user2, user3, treasury;

//   beforeEach(async () => {
//     [owner, user1, user2, user3,treasury] = await ethers.getSigners();

//     // Deploy Token
//     const Token = await ethers.getContractFactory("MagaFox47");
//     const tokenName = "MagaFox47";
//     const tokenSymbol = "MF47";
//     const initialSupplyForTokenomics = toWad(1_000_000_000);
//     const imageURI =
//       "https://bafkreieonkqpkf26xqbyqnxpguzna6rizwndsdh4t35usjce5d5fhqc37q.ipfs.dweb.link/";
//     const initialWallets = zeros10();

//     token = await Token.deploy(
//       tokenName,
//       tokenSymbol,
//       initialSupplyForTokenomics,
//       imageURI,
//       initialWallets
//     );
//     await token.waitForDeployment();

//     // Enable minting & mint supply to owner
//     await token.setContractState(1, true);
//     await token.mintWithoutRestriction(owner.address, toWad(1_000_000_000));

//     // Deploy Vesting
//     const Vesting = await ethers.getContractFactory("MAGAFox47Vesting");
//     vesting = await Vesting.deploy(await token.getAddress());

//     // Deploy Presale
//     const vt = {
//       startDelay: 0,
//       cliff: 0,
//       duration: 3600,
//       slice: 60,
//       revocable: false,
//     };
//     const PreSell = await ethers.getContractFactory("PreSellMagaFox");
//     presale = await PreSell.deploy(
//       await token.getAddress(),
//       await vesting.getAddress(),
//       treasury.address,
//       ethers.parseEther("0.001"),
//       Math.floor(Date.now() / 1000) - 10,
//       Math.floor(Date.now() / 1000) + 86400,
//       ethers.parseEther("10"),
//       ethers.parseEther("0.01"),
//       ethers.parseEther("5"),
//       vt
//     );

//     // Fund presale
//     const tokensForSale = ethers.parseEther("1000000");
//     await token.transfer(await presale.getAddress(), tokensForSale);
//     await presale.approveVesting(tokensForSale);
//     await presale.setWhitelistEnabled(true);
// await presale.setWhitelist([user1.address], true);

//     // ✅ allow presale to create vesting schedules
//     // await vesting.setLocker(await presale.getAddress(), true);
//   });

//   it("should allow user to buy tokens and create vesting schedule", async () => {
//     const weiToSpend = ethers.parseEther("0.1");
//     await expect(
//       presale.connect(user1).PurchasedToken(user1.address, { value: weiToSpend })
//     ).to.emit(presale, "Purchased");

//     expect(await presale.spent(user1.address)).to.equal(weiToSpend);
//     expect(await presale.totalRaisedWei()).to.equal(weiToSpend);
//   });

//   it("should enforce min and max per wallet", async () => {
//     await expect(
//       presale
//         .connect(user1)
//         .PurchasedToken(user1.address, { value: ethers.parseEther("0.001") })
//     ).to.be.revertedWithCustomError(presale, "AmountTooSmall");

//     await expect(
//       presale
//         .connect(user1)
//         .PurchasedToken(user1.address, { value: ethers.parseEther("6") })
//     ).to.be.revertedWithCustomError(presale, "AmountTooLarge");
//   });

//   // it("should not exceed hard cap", async () => {

//   //     await presale.setWhitelist([user1.address, user2.address], true);

//   //   await presale
//   //     .connect(user1)
//   //     .PurchasedToken(user1.address, { value: ethers.parseEther("5") });
//   //   await expect(
//   //     presale
//   //       .connect(user2)
//   //       .PurchasedToken(user2.address, { value: ethers.parseEther("6") })
//   //   ).to.be.revertedWithCustomError(presale, "CapExceeded");
//   // });

// it("should not exceed hard cap", async () => {
//   await presale.setWhitelist([user1.address, user2.address, user3.address], true);

//   // user1 buys 5 ETH
//   await presale
//     .connect(user1)
//     .PurchasedToken(user1.address, { value: ethers.parseEther("5") });

//   // user2 buys 5 ETH
//   await presale
//     .connect(user2)
//     .PurchasedToken(user2.address, { value: ethers.parseEther("5") });

//   // total = 10 ETH (cap reached)

//   // user3 tries even 0.1 ETH → should trigger CapExceeded
//   await expect(
//     presale
//       .connect(user3)
//       .PurchasedToken(user3.address, { value: ethers.parseEther("0.1") })
//   ).to.be.revertedWithCustomError(presale, "CapExceeded");
// });

//   it("should forward raised funds to treasury", async () => {
//     const before = await ethers.provider.getBalance(treasury.address);
//     await presale
//       .connect(user1)
//       .PurchasedToken(user1.address, { value: ethers.parseEther("1") });
//     const after = await ethers.provider.getBalance(treasury.address);
//     expect(after - before).to.equal(ethers.parseEther("1"));
//   });

//   // it("should respect whitelist if enabled", async () => {
//   //   await presale.setWhitelistEnabled(true);
//   //   await expect(
//   //     presale
//   //       .connect(user1)
//   //       .PurchasedToken(user1.address, { value: ethers.parseEther("1") })
//   //   ).to.be.revertedWithCustomError(presale, "NotWhitelisted");

//   //   await presale.setWhitelist([user1.address], true);
//   //   await expect(
//   //     presale
//   //       .connect(user1)
//   //       .PurchasedToken(user1.address, { value: ethers.parseEther("1") })
//   //   ).to.emit(presale, "Purchased");
//   // });

//   it("should respect whitelist if enabled", async () => {
//   // fresh state: whitelist ON but no users whitelisted
//   await presale.setWhitelistEnabled(true);
//   await presale.setWhitelist([user1.address], false);

//   await expect(
//     presale
//       .connect(user1)
//       .PurchasedToken(user1.address, { value: ethers.parseEther("1") })
//   ).to.be.revertedWithCustomError(presale, "NotWhitelisted");

//   await presale.setWhitelist([user1.address], true);
//   await expect(
//     presale
//       .connect(user1)
//       .PurchasedToken(user1.address, { value: ethers.parseEther("1") })
//   ).to.emit(presale, "Purchased");
// });

// });











// import { expect } from "chai";
// import hre from "hardhat";
// const { ethers } = hre;

// const toWad = (n) => ethers.parseUnits(String(n), 18);

// async function fastForwardTo(target) {
//   const block = await ethers.provider.getBlock("latest");
//   const latest = block.timestamp;
//   if (target <= latest) {
//     target = latest + 1; // ensure strictly greater
//   }
//   await hre.network.provider.send("evm_setNextBlockTimestamp", [target]);
//   await hre.network.provider.send("evm_mine");
// }

// describe("PreSellMagaFox", function () {
//   let deployer, alice, bob, stranger;
//   let token, vesting, presale;
//   let startTs, endTs;

//   beforeEach(async function () {
//     [deployer, alice, bob, stranger] = await ethers.getSigners();

//     // Deploy token
//     const Token = await ethers.getContractFactory("MagaFox47");
//     token = await Token.deploy(
//       "MagaFox47",
//       "MF47",
//       toWad(1_000_000_000),
//       "ipfs://fake",
//       new Array(10).fill(ethers.ZeroAddress)
//     );
//     await token.waitForDeployment();
//     await token.setContractState(1, true);
//     await token.mintWithoutRestriction(deployer.address, toWad(1_000_000_000));

//     // Deploy vesting mock (simplified for testing, must have lock())
//     const Vesting = await ethers.getContractFactory("MAGAFox47Vesting");
//     vesting = await Vesting.deploy(await token.getAddress());
//     await vesting.waitForDeployment();

//     // Sale times
//     // Sale times
//     const now = (await ethers.provider.getBlock("latest")).timestamp;
//     startTs = now + 3600; // Sale starts in 1 hour
//     endTs = now + 7200; // Sale ends in 2 hours
//     // Vesting template
//     const vt = [0, 0, 3600, 60, false];

//     // Deploy presale
//     const Presale = await ethers.getContractFactory("PreSellMagaFox");
//     presale = await Presale.deploy(
//       await token.getAddress(),
//       await vesting.getAddress(),
//       ethers.parseUnits("100", 18), // 100 tokens per ETH
//       startTs,
//       endTs,
//       toWad(100_000), // hard cap
//       toWad(10), // min
//       toWad(50_000), // max
//       vt
//     );
//     await presale.waitForDeployment();

//     // Fund presale
//     await token.transfer(await presale.getAddress(), toWad(100_000));
//     await presale.approveVesting(toWad(100_000));
//   });

//   // ---- Core Buy flow ----
//   describe("buy()", function () {
//     it("reverts if sale not open", async () => {
//       // presale already funded in beforeEach
//       await token.transfer(await presale.getAddress(), toWad(1000));
//       await presale.connect(deployer).approveVesting(toWad(1000));

//       // Fast forward to BEFORE saleStart
//       await fastForwardTo(startTs - 10);

//       await expect(
//         presale.connect(alice).buy(alice.address, { value: toWad(1) })
//       ).to.be.revertedWithCustomError(presale, "SaleNotOpen");
//     });

//     it("allows purchase when sale is open", async () => {
//       await fastForwardTo(startTs + 10);

//       await expect(
//         presale.connect(alice).buy(alice.address, { value: toWad(1) })
//       ).to.emit(presale, "Purchased");

//       const purchased = await presale.purchased(alice.address);
//       expect(purchased).to.be.gt(0);
//     });

//     it("reverts if sale ended", async () => {
//       await fastForwardTo(endTs + 10);

//       await expect(
//         presale.connect(alice).buy(alice.address, { value: toWad(1) })
//       ).to.be.revertedWithCustomError(presale, "SaleNotOpen");
//     });

//     it("reverts if zero beneficiary", async () => {
//       await fastForwardTo(startTs + 10);
//       await expect(
//         presale.connect(alice).buy(ethers.ZeroAddress, { value: toWad(1) })
//       ).to.be.revertedWithCustomError(presale, "ZeroAddress");
//     });

//     it("allows purchase and locks tokens into vesting", async () => {
//       await hre.network.provider.send("evm_setNextBlockTimestamp", [
//         startTs + 10,
//       ]);

//       const weiValue = ethers.parseEther("1");
//       const tx = await presale
//         .connect(alice)
//         .buy(alice.address, { value: weiValue });
//       const rc = await tx.wait();

//       const ev = rc.logs.find((l) => l.fragment?.name === "Purchased");
//       expect(ev).to.not.be.undefined;

//       const purchased = await presale.purchased(alice.address);
//       expect(purchased).to.be.gt(0);
//     });

//     it("respects min and max per wallet", async () => {
//       await hre.network.provider.send("evm_setNextBlockTimestamp", [
//         startTs + 10,
//       ]);

//       // Too small
//       await expect(
//         presale
//           .connect(alice)
//           .buy(alice.address, { value: ethers.parseEther("0.00001") })
//       ).to.be.revertedWithCustomError(presale, "AmountTooSmall");

//       // Too large
//       await expect(
//         presale
//           .connect(alice)
//           .buy(alice.address, { value: ethers.parseEther("1000") })
//       ).to.be.revertedWithCustomError(presale, "AmountTooLarge");
//     });

//     it("reverts if hard cap exceeded", async () => {
//       await hre.network.provider.send("evm_setNextBlockTimestamp", [
//         startTs + 10,
//       ]);

//       // sell close to hard cap
//       await presale
//         .connect(alice)
//         .buy(alice.address, { value: ethers.parseEther("9") });
//       await expect(
//         presale
//           .connect(bob)
//           .buy(bob.address, { value: ethers.parseEther("1000") })
//       ).to.be.revertedWithCustomError(presale, "AmountTooLarge");
//     });
//   });

//   // ---- Whitelist ----
//   // describe("whitelist", function () {
//   //   it("blocks non-whitelisted when enabled", async () => {
//   //     await presale.setWhitelistEnabled(true);
//   //     await hre.network.provider.send("evm_setNextBlockTimestamp", [
//   //       startTs + 10,
//   //     ]);
//   //     await expect(
//   //       presale
//   //         .connect(alice)
//   //         .buy(alice.address, { value: ethers.parseEther("1") })
//   //     ).to.be.revertedWithCustomError(presale, "NotWhitelisted");

//   //     await presale.setWhitelist([alice.address], true);
//   //     await expect(
//   //       presale
//   //         .connect(alice)
//   //         .buy(alice.address, { value: ethers.parseEther("1") })
//   //     ).to.not.be.reverted;
//   //   });
//   // });

//   // ---- Admin functions ----
//   describe("admin", function () {
//     it("owner can set rate/times/caps", async () => {
//       await expect(presale.setRate(ethers.parseUnits("200", 18))).to.emit(
//         presale,
//         "RateUpdated"
//       );
//       await expect(presale.setTimes(startTs, endTs + 100)).to.emit(
//         presale,
//         "TimesUpdated"
//       );
//       await expect(
//         presale.setCaps(toWad(200_000), toWad(5), toWad(50_000))
//       ).to.emit(presale, "CapsUpdated");
//     });

//     it("pause/unpause works", async () => {
//       await presale.pause();
//       await hre.network.provider.send("evm_setNextBlockTimestamp", [
//         startTs + 10,
//       ]);
//       await expect(
//         presale
//           .connect(alice)
//           .buy(alice.address, { value: ethers.parseEther("1") })
//       ).to.be.revertedWith("Pausable: paused");

//       await presale.unpause();
//       await expect(
//         presale
//           .connect(alice)
//           .buy(alice.address, { value: ethers.parseEther("1") })
//       ).to.not.be.reverted;
//     });
//   });

//   // // ---- Withdraw ----
//   describe("funds", function () {
//     it("owner can withdraw ETH", async () => {
//       await hre.network.provider.send("evm_setNextBlockTimestamp", [
//         startTs + 10,
//       ]);
//       await presale
//         .connect(alice)
//         .buy(alice.address, { value: ethers.parseEther("1") });

//       const balBefore = await ethers.provider.getBalance(deployer.address);
//       const tx = await presale.withdrawFunds(
//         deployer.address,
//         ethers.parseEther("1")
//       );
//       await tx.wait();
//       const balAfter = await ethers.provider.getBalance(deployer.address);
//       expect(balAfter).to.be.gt(balBefore);
//     });

//     it("owner cannot recover sale token", async () => {
//       await expect(
//         presale.recoverERC20(await token.getAddress(), deployer.address, 100)
//       ).to.be.revertedWithCustomError(presale, "InvalidParams");
//     });
//   });

//   // ---- Allowance ----
//   describe("vesting allowance", function () {
//     it("owner can approve vesting", async () => {
//       await expect(presale.approveVesting(toWad(1000))).to.emit(
//         presale,
//         "VestingAllowanceApproved"
//       );
//     });
//   });
// });







import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

const toWad = (n) => ethers.parseUnits(String(n), 18);

async function fastForwardTo(target) {
  const block = await ethers.provider.getBlock("latest");
  const latest = block.timestamp;
  if (target <= latest) target = latest + 1;
  await hre.network.provider.send("evm_setNextBlockTimestamp", [target]);
  await hre.network.provider.send("evm_mine");
}

describe("PreSellMagaFox", function () {
  let deployer, alice, bob, stranger;
  let token, vesting, presale;
  let startTs, endTs;

  beforeEach(async function () {
    [deployer, alice, bob, stranger] = await ethers.getSigners();

    // Deploy token
    const Token = await ethers.getContractFactory("MagaFox47");
    token = await Token.deploy(
      "MagaFox47",
      "MF47",
      toWad(1_000_000_000),
      "ipfs://fake",
      new Array(10).fill(ethers.ZeroAddress)
    );
    await token.waitForDeployment();
    await token.setContractState(1, true);
    await token.mintWithoutRestriction(deployer.address, toWad(1_000_000_000));

    // Deploy vesting mock
    const Vesting = await ethers.getContractFactory("MAGAFox47Vesting");
    vesting = await Vesting.deploy(await token.getAddress());
    await vesting.waitForDeployment();

    // Sale times
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    startTs = now + 3600; // Sale starts in 1 hour
    endTs = now + 7200;   // Sale ends in 2 hours

    // Vesting template
    const vt = [0, 0, 3600, 60, false];

    // Deploy presale
    const Presale = await ethers.getContractFactory("PreSellMagaFox");
    presale = await Presale.deploy(
      await token.getAddress(),
      await vesting.getAddress(),
      deployer.address,      // treasury wallet set to deployer
      ethers.parseUnits("100", 18),
      startTs,
      endTs,
      toWad(100_000),
      toWad(10),
      toWad(50_000),
      vt
    );
    await presale.waitForDeployment();

    // Fund presale
    await token.transfer(await presale.getAddress(), toWad(100_000));
    await presale.approveVesting(toWad(100_000));
  });

  // ---- Core Buy flow ----
  describe("buy()", function () {



  it("reverts if sale not open", async () => {
      // presale already funded in beforeEach
      await token.transfer(await presale.getAddress(), toWad(1000));
      await presale.connect(deployer).approveVesting(toWad(1000));

      // Fast forward to BEFORE saleStart
      await fastForwardTo(startTs - 10);

      await expect(
        presale.connect(alice).buy(alice.address, { value: toWad(1) })
      ).to.be.revertedWithCustomError(presale, "SaleNotOpen");
    });


    it("sends ETH directly to treasury", async () => {
      await fastForwardTo(startTs + 10);

      const treasuryBefore = await ethers.provider.getBalance(deployer.address);
      const weiValue = ethers.parseEther("1");
      await presale.connect(alice).buy(alice.address, { value: weiValue });
      const treasuryAfter = await ethers.provider.getBalance(deployer.address);

      expect(treasuryAfter).to.be.gt(treasuryBefore);
    });

    it("allows purchase when sale is open", async () => {
      await fastForwardTo(startTs + 10);

      await expect(
        presale.connect(alice).buy(alice.address, { value: toWad(1) })
      ).to.emit(presale, "Purchased");

      const purchased = await presale.purchased(alice.address);
      expect(purchased).to.be.gt(0);
    });


    it("allows purchase and locks tokens into vesting", async () => {
      await hre.network.provider.send("evm_setNextBlockTimestamp", [
        startTs + 10,
      ]);

      const weiValue = ethers.parseEther("1");
      const tx = await presale
        .connect(alice)
        .buy(alice.address, { value: weiValue });
      const rc = await tx.wait();

      const ev = rc.logs.find((l) => l.fragment?.name === "Purchased");
      expect(ev).to.not.be.undefined;

      const purchased = await presale.purchased(alice.address);
      expect(purchased).to.be.gt(0);
    });

    it("reverts if sale not open", async () => {
      await fastForwardTo(startTs - 10);
      await expect(
        presale.connect(alice).buy(alice.address, { value: toWad(1) })
      ).to.be.revertedWithCustomError(presale, "SaleNotOpen");
    });
     it("reverts if sale ended", async () => {
      await fastForwardTo(endTs + 10);

      await expect(
        presale.connect(alice).buy(alice.address, { value: toWad(1) })
      ).to.be.revertedWithCustomError(presale, "SaleNotOpen");
    });

    it("reverts if zero beneficiary", async () => {
      await fastForwardTo(startTs + 10);
      await expect(
        presale.connect(alice).buy(ethers.ZeroAddress, { value: toWad(1) })
      ).to.be.revertedWithCustomError(presale, "ZeroAddress");
    });

    it("respects min and max per wallet", async () => {
      await fastForwardTo(startTs + 10);

      await expect(
        presale.connect(alice).buy(alice.address, { value: ethers.parseEther("0.00001") })
      ).to.be.revertedWithCustomError(presale, "AmountTooSmall");

      await expect(
        presale.connect(alice).buy(alice.address, { value: ethers.parseEther("1000") })
      ).to.be.revertedWithCustomError(presale, "AmountTooLarge");
    });

    

    it("reverts if hard cap exceeded", async () => {
      await hre.network.provider.send("evm_setNextBlockTimestamp", [
        startTs + 10,
      ]);

      // sell close to hard cap
      await presale
        .connect(alice)
        .buy(alice.address, { value: ethers.parseEther("9") });
      await expect(
        presale
          .connect(bob)
          .buy(bob.address, { value: ethers.parseEther("1000") })
      ).to.be.revertedWithCustomError(presale, "AmountTooLarge");
    });


  });

// ---- Whitelist ----
 describe("whitelist", function () {
    it("blocks non-whitelisted when enabled", async () => {
      await presale.setWhitelistEnabled(true);

      // Add custom error to contract if not present
      await hre.network.provider.send("evm_setNextBlockTimestamp", [
        startTs + 10,
      ]);

      await expect(
        presale.connect(alice).buy(alice.address, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(presale, "NotWhitelisted");

      // Now whitelist Alice
      await presale.setWhitelist([alice.address], true);
      await expect(
        presale.connect(alice).buy(alice.address, { value: ethers.parseEther("1") })
      ).to.not.be.reverted;
    });
});

describe("treasury management", function () {
    it("owner can update treasury address and ETH is sent there", async () => {
      const newTreasury = bob.address;
      await presale.setTreasury(newTreasury);

      // Fast forward to sale start
      await hre.network.provider.send("evm_setNextBlockTimestamp", [startTs + 10]);

      const balBefore = await ethers.provider.getBalance(newTreasury);

      const weiValue = ethers.parseEther("1");
      await presale.connect(alice).buy(alice.address, { value: weiValue });

      const balAfter = await ethers.provider.getBalance(newTreasury);
      expect(balAfter).to.be.gt(balBefore);
    });
});

  // ---- Admin functions ----
  describe("admin", function () {
    it("owner can set rate/times/caps", async () => {
      await expect(presale.setRate(ethers.parseUnits("200", 18))).to.emit(presale, "RateUpdated");
      await expect(presale.setTimes(startTs, endTs + 100)).to.emit(presale, "TimesUpdated");
      await expect(presale.setCaps(toWad(200_000), toWad(5), toWad(50_000))).to.emit(presale, "CapsUpdated");
    });

    it("pause/unpause works", async () => {
      await presale.pause();
      await fastForwardTo(startTs + 10);
      await expect(
        presale.connect(alice).buy(alice.address, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Pausable: paused");

      await presale.unpause();
      await expect(
        presale.connect(alice).buy(alice.address, { value: ethers.parseEther("1") })
      ).to.not.be.reverted;
    });
  });

  // ---- Allowance ----
  describe("vesting allowance", function () {
    it("owner can approve vesting", async () => {
      await expect(presale.approveVesting(toWad(1000))).to.emit(
        presale,
        "VestingAllowanceApproved"
      );
    });
  });



/   // // ---- Withdraw ----
  describe("funds", function () {
    // it("owner can withdraw ETH", async () => {
    //   await hre.network.provider.send("evm_setNextBlockTimestamp", [
    //     startTs + 10,
    //   ]);
    //   await presale
    //     .connect(alice)
    //     .buy(alice.address, { value: ethers.parseEther("1") });

    //   const balBefore = await ethers.provider.getBalance(deployer.address);
    //   const tx = await presale.withdrawFunds(
    //     deployer.address,
    //     ethers.parseEther("1")
    //   );
    //   await tx.wait();
    //   const balAfter = await ethers.provider.getBalance(deployer.address);
    //   expect(balAfter).to.be.gt(balBefore);
    // });

    it("owner cannot recover sale token", async () => {
      await expect(
        presale.recoverERC20(await token.getAddress(), deployer.address, 100)
      ).to.be.revertedWithCustomError(presale, "InvalidParams");
    });
  });
});
