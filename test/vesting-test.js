// import { expect } from "chai";
// import hardhat from "hardhat";
// const { ethers } = hardhat;

// describe("TokenVesting", function () {
//   let Token, Vesting, token, vesting;
//   let owner, user1;
//   const totalVested = ethers.parseEther("1000"); // ✅ v6 style

//   beforeEach(async function () {
//     [owner, user1] = await ethers.getSigners();

//     // Deploy token (make sure MagaFox47 has mint function)
//     Token = await ethers.getContractFactory("MagaFox47");
//     token = await Token.deploy();
//     await token.waitForDeployment();

//     // Deploy vesting contract with both constructor params
//     const VestingFactory = await ethers.getContractFactory("TokenVesting");
//     vesting = await VestingFactory.deploy(
//       await token.getAddress(), // tokenAddress
//       owner.address              // admin
//     );
//     await vesting.waitForDeployment();

//     // Mint tokens to vesting contract
//     await token.mint(await vesting.getAddress(), totalVested);
//   });

//   it("should add vesting schedule", async function () {
//     const now = Math.floor(Date.now() / 1000);
//     const start = now + 10;
//     const cliff = 60; // 1 min
//     const duration = 600; // 10 min

//     await expect(
//       vesting.addVestingSchedule(user1.address, totalVested, start, cliff, duration)
//     ).to.emit(vesting, "VestingAdded");
//   });

//   it("should not release tokens before cliff", async function () {
//     const now = Math.floor(Date.now() / 1000);
//     const start = now;
//     const cliff = 300; // 5 mins
//     const duration = 600;

//     await vesting.addVestingSchedule(user1.address, totalVested, start, cliff, duration);

//     await ethers.provider.send("evm_increaseTime", [100]); // fast-forward
//     await ethers.provider.send("evm_mine");

//     await expect(vesting.connect(user1).release())
//       .to.be.revertedWith("No tokens to release");
//   });

//   it("should release tokens after cliff and partial time", async function () {
//     const now = Math.floor(Date.now() / 1000);
//     const start = now;
//     const cliff = 60;
//     const duration = 600;

//     await vesting.addVestingSchedule(user1.address, totalVested, start, cliff, duration);

//     await ethers.provider.send("evm_increaseTime", [300]); // fast-forward 5 mins
//     await ethers.provider.send("evm_mine");

//     const releasable = await vesting.getReleasableAmount(user1.address);
//     expect(releasable).to.be.gt(0);

//     await expect(vesting.connect(user1).release())
//       .to.emit(vesting, "TokensReleased")
//       .withArgs(user1.address, releasable);
//   });
// });

// import { expect } from "chai";
// import hardhat from "hardhat";
// const { ethers } = hardhat;

// describe("TokenVesting", function () {
//   let token, vesting;
//   let owner, user1;
//   const totalVested = ethers.parseEther("1000");

//   beforeEach(async function () {
//   [owner, user1] = await ethers.getSigners();
//   // Deploy token
//   const Token = await ethers.getContractFactory("MagaFox47");
//   console.log("🚀 ~ Token:", Token)
//   token = await Token.deploy();
//   console.log("🚀 ~ token:", token)
//   const res=await token.waitForDeployment();
//   console.log("🚀 ~ res:", res)

//   // Deploy vesting with correct constructor params
//   const Vesting = await ethers.getContractFactory("TokenVesting");
//   console.log("🚀 ~ Vesting:", Vesting)
//   vesting = await Vesting.deploy(await token.getAddress(), owner.address);
//   await vesting.waitForDeployment();

//   // Fund vesting contract
//   await token.mint(await vesting.getAddress(), totalVested);
// });

//   it("should add vesting schedule", async function () {
//     const now = Math.floor(Date.now() / 1000);
//     const start = now + 10;
//     const cliff = 60;
//     const duration = 600;

//     await expect(
//       vesting.addVestingSchedule(user1.address, totalVested, start, cliff, duration)
//     ).to.emit(vesting, "VestingAdded");
//   });

//   it("should not release tokens before cliff", async function () {
//     const now = Math.floor(Date.now() / 1000);
//     const start = now;
//     const cliff = 300;
//     const duration = 600;

//     await vesting.addVestingSchedule(user1.address, totalVested, start, cliff, duration);

//     await ethers.provider.send("evm_increaseTime", [100]);
//     await ethers.provider.send("evm_mine");

//     await expect(vesting.connect(user1).release())
//       .to.be.revertedWith("No tokens to release");
//   });

//   it("should release tokens after cliff and partial time", async function () {
//     const now = Math.floor(Date.now() / 1000);
//     const start = now;
//     const cliff = 60;
//     const duration = 600;

//     await vesting.addVestingSchedule(user1.address, totalVested, start, cliff, duration);

//     await ethers.provider.send("evm_increaseTime", [300]);
//     await ethers.provider.send("evm_mine");

//     const releasable = await vesting.getReleasableAmount(user1.address);
//     expect(releasable).to.be.gt(0);

//     await expect(vesting.connect(user1).release())
//       .to.emit(vesting, "TokensReleased")
//       .withArgs(user1.address, releasable);
//   });

//   it("should release full tokens after duration", async function () {
//     const now = Math.floor(Date.now() / 1000);
//     const start = now;
//     const cliff = 60;
//     const duration = 600;

//     await vesting.addVestingSchedule(user1.address, totalVested, start, cliff, duration);

//     await ethers.provider.send("evm_increaseTime", [duration + 10]);
//     await ethers.provider.send("evm_mine");

//     await expect(vesting.connect(user1).release())
//       .to.emit(vesting, "TokensReleased")
//       .withArgs(user1.address, totalVested);
//   });
// });

// -----------------------------------------------------

// import { expect } from "chai";
// import hardhat from "hardhat";
// const { ethers } = hardhat;

// /**
//  * Test suite for MagaFox47Vesting (escrow model) + MagaFox47 token
//  *
//  * What we cover:
//  *  - Deploy MagaFox47 + MagaFox47Vesting
//  *  - Fund escrow via token mint + approve + fund()
//  *  - Create schedule (TGE + cliff + linear) and claim around boundaries
//  *  - Revoke flow (unvested -> treasury, vested stays with beneficiary)
//  *  - Pause/unpause blocks claims
//  *  - Batch create + claimMany
//  *
//  * Assumptions:
//  *  - contracts/MagaFox47.sol and contracts/MagaFox47Vesting.sol exist and compile
//  *  - OpenZeppelin v4.x style imports in both contracts
//  */

// describe("MagaFox47Vesting (with MagaFox47 token) — escrow model", function () {
//   let token;           // MagaFox47
//   let vesting;         // MagaFox47Vesting
//   let owner, admin, treasury, alice, bob, other;

//   const NAME = "MagaFox47";
//   const SYMBOL = "MFOX";
//   const IMAGE = "ipfs://image";
//   const DEC = 18n;

//   const toUnits = (n) => ethers.parseUnits(n, DEC);

//   // Role IDs from contract conventions
//   let MINTER_ROLE, DEFAULT_ADMIN_ROLE;

//   before(async () => {
//     MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
//     DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
//   });

//   beforeEach(async () => {
//     [owner, admin, treasury, alice, bob, other] = await ethers.getSigners();

//     // 1) Deploy MagaFox47 with empty initialWallets (as your pattern)
//     const MagaFox47 = await ethers.getContractFactory("MagaFox47");
//     token = await MagaFox47.deploy(
//       NAME,
//       SYMBOL,
//       toUnits("1000000000"), // initialSupply param used only for tokenomics math (no mint)
//       IMAGE,
//       [] // initialWallets - allocate later if needed
//     );
//     await token.waitForDeployment();

//     // Sanity: owner is DEFAULT_ADMIN + Ownable
//     expect(await token.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.equal(true);
//     expect(await token.owner()).to.equal(owner.address);

//     // 2) Enable minting so we can fund escrow
//     await (await token.setContractState(1, true)).wait(); // 1 = minting on

//     // Owner already has MINTER_ROLE from constructor; mint to owner
//     await (await token.mint(owner.address, toUnits("10000000"), false)).wait(); // 10M for tests

//     // 3) Deploy Vesting (escrow)
//     const Vesting = await ethers.getContractFactory("MagaFox47Vesting");
//     vesting = await Vesting.deploy(await token.getAddress(), treasury.address, admin.address);
//     await vesting.waitForDeployment();

//     // Connect vesting with admin for admin-only calls
//     vesting = vesting.connect(admin);

//     await token.connect(owner).approve(await vesting.getAddress(), toUnits("5000000"));
// await vesting.connect(owner).fund(toUnits("5000000")); // call as owner, not admin
//   });

//   // ----------------- helpers -----------------
//   const nowSec = async () => Number((await ethers.provider.getBlock("latest")).timestamp);
//   const mineTo = async (ts) => {
//     const current = await nowSec();
//     if (ts > current) {
//       await ethers.provider.send("evm_setNextBlockTimestamp", [ts]);
//       await ethers.provider.send("evm_mine", []);
//     }
//   };

//   async function createSchedule(p) {
//     // p: { beneficiary,total,start,cliff,duration,tgeBps,revocable }
//     const tx = await vesting.createSchedule(p);
//     const rc = await tx.wait();
//     const ev = rc.logs.find((l) => l.fragment?.name === "ScheduleCreated");
//     return ev.args.id;
//   }

//   // ----------------- tests -----------------

//   it("deploys and funds escrow", async () => {
//     // basic sanity: escrow funded by 5,000,000 tokens
//     // we can’t read vesting balance directly via public var; use ERC20 balanceOf
//     const bal = await token.balanceOf(await vesting.getAddress());
//     expect(bal).to.equal(toUnits("5000000"));
//   });

//   it("creates a schedule and reads it back", async () => {
//     const start = BigInt((await nowSec()) + 60); // starts in 60s
//     const params = {
//       beneficiary: alice.address,
//       total: toUnits("10000"),
//       start,
//       cliff: 0n,
//       duration: 3600n,
//       tgeBps: 1000, // 10%
//       revocable: true
//     };
//     const id = await createSchedule(params);
//     const s = await vesting.getSchedule(id);
//     expect(s.beneficiary).to.equal(alice.address);
//     expect(s.total).to.equal(params.total);
//     expect(s.tgeBps).to.equal(params.tgeBps);
//     expect(s.revocable).to.equal(true);
//   });

//   it("claims TGE at start, then linear after cliff, then full at end", async () => {
//     const tStart = (await nowSec()) + 10; // start in 10s
//     const total = toUnits("10000");
//     const tgeBps = 2500;   // 25% at TGE
//     const duration = 1000; // 1000s linear
//     const cliff = 100;     // 100s cliff

//     const id = await createSchedule({
//       beneficiary: alice.address,
//       total,
//       start: BigInt(tStart),
//       cliff: BigInt(cliff),
//       duration: BigInt(duration),
//       tgeBps,
//       revocable: false
//     });

//     // Before start: 0 releasable
//     await mineTo(tStart - 1);
//     expect(await vesting.releasable(id)).to.equal(0);

//     // At start: TGE available (25%)
//     await mineTo(tStart);
//     const tgeAmt = (total * 2500n) / 10000n;
//     await expect(vesting.connect(alice).claim(id))
//       .to.emit(vesting, "TokensClaimed")
//       .withArgs(id, alice.address, tgeAmt, tgeAmt);
//     expect(await token.balanceOf(alice.address)).to.equal(tgeAmt);

//     // Between start and cliff: no linear
//     await mineTo(tStart + Math.floor(cliff / 2));
//     expect(await vesting.releasable(id))
//     expect(relMid).to.equal(0n); // no new linear yet

//     // After cliff: some linear vests
//     await mineTo(tStart + cliff + 100);
//     const rel = await vesting.releasable(id);
//     expect(rel).to.be.gt(0n);
//     await vesting.connect(alice).claim(id);

//     // At end: all vested
//     await mineTo(tStart + cliff + duration);
//     const s = await vesting.getSchedule(id);
//     const remaining = s.total - s.released;
//     await expect(vesting.connect(alice).claim(id))
//       .to.emit(vesting, "TokensClaimed")
//       .withArgs(id, alice.address, remaining, s.total);

//     expect(await token.balanceOf(alice.address)).to.equal(total);
//   });

//   it("revokes: unvested returns to treasury, vested stays with beneficiary", async () => {
//     const tStart = (await nowSec()) + 5;
//     const total = toUnits("2000");
//     const tgeBps = 1000; // 10%
//     const cliff = 50;
//     const dur = 200;

//     const id = await createSchedule({
//       beneficiary: bob.address,
//       total,
//       start: BigInt(tStart),
//       cliff: BigInt(cliff),
//       duration: BigInt(dur),
//       tgeBps,
//       revocable: true
//     });

//     // At start: claim TGE (10%)
//     await mineTo(tStart);
//     const tge = (total * 1000n) / 10000n;
//     await vesting.connect(bob).claim(id);
//     expect(await token.balanceOf(bob.address)).to.equal(tge);

//     // Move just after cliff to accrue some linear
//     await mineTo(tStart + cliff + 30);

//     // Revoke now (admin)
//     await expect(vesting.revoke(id)).to.emit(vesting, "ScheduleRevoked");

//     // After revoke: no more claimable (cap at revokeTime)
//     expect(await vesting.releasable(id)).to.equal(0);

//     // Treasury should have received some non-zero unvested portion
//     expect(await token.balanceOf(treasury.address)).to.be.gt(0n);
//   });

//   it("pause blocks claim; unpause resumes", async () => {
//     const tStart = await nowSec();
//     const id = await createSchedule({
//       beneficiary: alice.address,
//       total: toUnits("100"),
//       start: BigInt(tStart),
//       cliff: 0n,
//       duration: 100n,
//       tgeBps: 1000, // 10% TGE
//       revocable: false
//     });

//     await vesting.pause();
//     await expect(vesting.connect(alice).claim(id)).to.be.reverted; // paused
//     await vesting.unpause();
//     await vesting.connect(alice).claim(id); // works
//   });

//   it("batch create + claimMany works", async () => {
//     const tStart = await nowSec();
//     const ids = [];
//     for (let i = 0; i < 3; i++) {
//       const id = await createSchedule({
//         beneficiary: alice.address,
//         total: toUnits("50"),
//         start: BigInt(tStart),
//         cliff: 0n,
//         duration: 50n,
//         tgeBps: 500, // 5% TGE
//         revocable: false
//       });
//       ids.push(id);
//     }

//     // initial claim for TGE from three schedules in one tx
//     await vesting.connect(alice).claimMany(ids);
//     const bal = await token.balanceOf(alice.address);
//     expect(bal).to.be.gt(0n);
//   });
// });

// -------------------------------------main chalta hoya-------------------------

// import { expect } from "chai";
// import hardhat from "hardhat";
// const { ethers } = hardhat;

// describe("MagaFox47Vesting", () => {
//   let vest, mfox, deployer, admin, user;
// const U = (x) => ethers.parseUnits(x, 18);
//   beforeEach(async () => {
//     [deployer, admin, user] = await ethers.getSigners();

//     // 1) Deploy the real MagaFox47 token for the test
//     const MagaFox = await ethers.getContractFactory("MagaFox47");
//     const name = "MagaFox47";
//     const symbol = "MAGA47"; // or "MFOX" if that's what you're using
//     const imageURI = "https://example.com/token.png";
//     // const initialSupply = ethers.parseUnits("1000000000", 18); // 1B
//      const initialSupply = U("1000000000")
//     const initialWallets = []; // constructor expects an array; empty is fine
//     mfox = await MagaFox.deploy(name, symbol, initialSupply, imageURI, initialWallets);
//     await mfox.waitForDeployment();

//     // 2) Deploy the vesting contract with (admin, tokenAddress)
//     const Vest = await ethers.getContractFactory("MagaFox47Vesting");
//     vest = await Vest.deploy(admin.address, await mfox.getAddress());
//     await vest.waitForDeployment();

//     // 3) Pre-fund vesting contract (escrow model)
//     // enable minting so owner can mint to vesting
//     await (await mfox.setContractState(1, true)).wait(); // enable minting
//     await (await mfox.mintWithoutRestriction(await vest.getAddress(), U("1000000"))).wait(); // 1M MFX for claims
//   });

//   it("creates a schedule (no tokens released yet)", async () => {
//     // const total = ethers.parseUnits("5000", 18);
//     const total = U("5000");
//     const now = Math.floor(Date.now() / 1000);
//     const cliff = 60 * 60 * 24 * 30;     // 30 days
//     const duration = 60 * 60 * 24 * 365; // 1 year

//     await vest.connect(admin).createSchedule(
//       user.address,
//       total,
//       now,
//       cliff,
//       duration
//     );

//     const s = await vest.schedules(user.address);
//     expect(s.beneficiary).to.equal(user.address);
//     expect(s.totalAmount).to.equal(total);
//     expect(s.released).to.equal(0n);
//     expect(s.start).to.equal(BigInt(now));
//     expect(s.cliff).to.equal(BigInt(cliff));
//     expect(s.duration).to.equal(BigInt(duration));
//   });

//    it("prevents claiming before cliff, then allows partial claims, then full", async () => {
//     const now = Math.floor(Date.now() / 1000);
//     const cliff = 30 * 24 * 60 * 60;          // 30 days
//     const duration = 365 * 24 * 60 * 60;      // 12 months total
//     const total = U("12000");                 // 12,000 MFX

//     // create schedule
//     await vest.connect(admin).createSchedule(user.address, total, now, cliff, duration);

//     // Before cliff: nothing vested
//     expect(await vest.vested(user.address)).to.equal(0n);
//     await expect(vest.connect(user).claim()).to.be.revertedWith("Nothing to claim");

//     // Jump just past cliff (+1 day)
//     await ethers.provider.send("evm_increaseTime", [cliff + 24 * 60 * 60]);
//     await ethers.provider.send("evm_mine", []);

//     // Read releasable (will be > 0)
//     const rel1 = await vest.releasable(user.address);
//     expect(rel1).to.be.gt(0n);

//     // Claim (allow tiny drift between read and claim)
//     const bal0 = await mfox.balanceOf(user.address);
//     await (await vest.connect(user).claim()).wait();
//     const bal1 = await mfox.balanceOf(user.address);

//     const sMid = await vest.schedules(user.address);
//     const totalLinear = BigInt(Number(sMid.duration) - Number(sMid.cliff)); // linear seconds
//     const perSec = sMid.totalAmount / totalLinear; // vested per second
//     const claimed = bal1 - bal0;
//     const delta = claimed > rel1 ? claimed - rel1 : rel1 - claimed;
//     expect(delta).to.be.lte(perSec + 1n);

//     // Jump to EXACT vesting end and claim remainder
//     const endTs = Number(sMid.start) + Number(sMid.duration);
//     await ethers.provider.send("evm_setNextBlockTimestamp", [endTs + 1]); // safely past end
//     await ethers.provider.send("evm_mine", []);

//     const rel2 = await vest.releasable(user.address);
//     expect(rel2).to.be.gt(0n);

//     await (await vest.connect(user).claim()).wait();
//     const bal2 = await mfox.balanceOf(user.address);

//     // Fully vested -> total claimed equals schedule total
//     expect(bal2).to.equal(total);
//   });

//    it("reverts if contract is underfunded", async () => {
//     const now = Math.floor(Date.now() / 1000);
//     const cliff = 0;
//     const duration = 30 * 24 * 60 * 60;
//     // create a huge schedule (more than escrowed)
//     const huge = U("2000000"); // 2M > 1M funded
//     await (await vest.connect(admin).createSchedule(user.address, huge, now, cliff, duration)).wait();

//     // fast-forward to full vest
//     await ethers.provider.send("evm_increaseTime", [duration + 1]);
//     await ethers.provider.send("evm_mine", []);

//     // claim will attempt to transfer and revert with ERC20: transfer amount exceeds balance
//     await expect(vest.connect(user).claim()).to.be.reverted;
//   });
// });

//----------------final------------------------

import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

const ONE = 1n;
const WAD = 10n ** 18n;

function toWad(n) {
  return ethers.parseUnits(String(n), 18);
}

function divDown(a, b) {
  return a / b;
}

const zeros10 = () => new Array(10).fill(ethers.ZeroAddress);

async function deployFixture() {
  const [owner, alice, bob, carol, treasury, stranger] =
    await ethers.getSigners();

  // Deploy your real token
  const Token = await ethers.getContractFactory("MagaFox47"); // <- exact name from your contract
  const name = "MagaFox47";
  const symbol = "MF47";
  const initialSupplyForTokenomics = toWad(1_000_000_000); // used for tokenomics math only
  const imageURI = "ipfs://dummy";
  const initialWallets = zeros10();

  const token = await Token.deploy(
    name,
    symbol,
    initialSupplyForTokenomics,
    imageURI,
    initialWallets
  );
  await token.waitForDeployment();

  // Enable minting and mint actual ERC20 balance to owner (so vesting can pull)
  await (await token.setContractState(1, true)).wait(); // 1 = enable minting
  await (
    await token.mintWithoutRestriction(owner.address, toWad(1_000_000_000))
  ).wait();

  // Deploy vesting pointing to this token
  const Vesting = await ethers.getContractFactory("MAGAFox47Vesting");
  const vesting = await Vesting.deploy(await token.getAddress());
  await vesting.waitForDeployment();

  return { owner, alice, bob, carol, treasury, stranger, token, vesting };
}

/** Mirror the contract's vesting math for assertions */
function expectedVested(
  total,
  start,
  cliff,
  duration,
  slice,
  t,
  revokedAt = null
) {
  let ts = BigInt(t);
  const S = BigInt(start),
    C = BigInt(cliff),
    D = BigInt(duration),
    SL = BigInt(slice);
  const end = S + D;

  // cap at revoke time if provided
  if (revokedAt && BigInt(revokedAt) < ts) ts = BigInt(revokedAt);

  if (ts < S + C) return 0n;
  if (ts >= end) return total;

  let elapsed = ts - S;
  if (SL > 1n) elapsed = (elapsed / SL) * SL;

  return (total * elapsed) / D;
}

// helper that reuses an existing deployment context
async function createVestingOn(ctx, who, amount, params = {}) {
  const { token, vesting } = ctx;
  const now = await time.latest();
  const start = params.start ?? now;
  const cliff = params.cliff ?? 0;
  const duration = params.duration ?? 100;
  const slice = params.slice ?? 1;
  const revocable = params.revocable ?? true;

  await token.approve(await vesting.getAddress(), amount);
  const tx = await vesting.lock(
    who,
    amount,
    start,
    cliff,
    duration,
    slice,
    revocable
  );
  const rc = await tx.wait();
  const ev = rc.logs.find((l) => l.fragment?.name === "ScheduleCreated");
  const id = ev.args.id;

  return { id, start, cliff, duration, slice, amount };
}

// Make createVestingFor GLOBAL so all describes can use it
async function createVestingFor(who, amount, params = {}) {
  const { owner, token, vesting } = await loadFixture(deployFixture);
  const now = await time.latest();
  const start = params.start ?? now;
  const cliff = params.cliff ?? 3600;
  const duration = params.duration ?? 3600 * 24 * 30;
  const slice = params.slice ?? 3600;
  const revocable = params.revocable ?? true;

  await token.approve(await vesting.getAddress(), amount);
  const tx = await vesting.lock(
    who,
    amount,
    start,
    cliff,
    duration,
    slice,
    revocable
  );
  const rc = await tx.wait();
  const ev = rc.logs.find((l) => l.fragment?.name === "ScheduleCreated");
  const id = ev.args.id;

  return { id, start, cliff, duration, slice, amount, vesting, token, owner };
}

// async function jumpTo(ts) {
//   await time.increaseTo(ts);
// }

const jumpTo = async (ts) => {
  await time.increaseTo(ts);
}; // works with bigint

describe("MAGAFox47Vesting", function () {
  describe("constructor", () => {
    it("sets immutable token and zeroed accounting", async () => {
      const { token, vesting } = await loadFixture(deployFixture);
      expect(await vesting.token()).to.equal(await token.getAddress());
      expect(await vesting.totalLocked()).to.equal(0n);
    });

    it("reverts on zero token addr", async () => {
      const Vesting = await ethers.getContractFactory("MAGAFox47Vesting");
      await expect(Vesting.deploy(ethers.ZeroAddress)).to.be.reverted;
    });
  });

  describe("lock()", () => {
    // it("creates schedule, pulls tokens, updates indexes & emits", async () => {
    //   const { owner, alice, token, vesting } = await loadFixture(deployFixture);

    //   const amount = toWad(1_000);
    //   await token.approve(await vesting.getAddress(), amount);

    //   const now = await time.latest();
    //   const start = now + 3600; // 1h in future
    //   const cliff = 3600;       // 1h cliff
    //   const duration = 3600 * 24 * 180; // ~180d
    //   const slice = 86400;      // daily

    //   const tx = await vesting.lock(alice.address, amount, start, cliff, duration, slice, true);
    //   const rc = await tx.wait();
    //   const ev = rc.logs.find((l) => (l ).fragment?.name === "ScheduleCreated") ;
    //   const id = ev?.args?.id ;
    //   expect(id).to.be.properHexString;

    //   // indexes
    //   const ids = await vesting.schedulesOf(alice.address);
    //   expect(ids).to.deep.equal([id]);

    //   // totalLocked
    //   expect(await vesting.totalLocked()).to.equal(amount);

    //   // getSchedule view
    //   const s = await vesting.getSchedule(id);
    //   expect(s.beneficiary).to.equal(alice.address);
    //   expect(s.start).to.equal(start);
    //   expect(s.cliff).to.equal(cliff);
    //   expect(s.duration).to.equal(duration);
    //   expect(s.slice).to.equal(slice);
    //   expect(s.revocable).to.equal(true);
    //   expect(s.revoked).to.equal(false);
    //   expect(s.total).to.equal(amount);
    //   expect(s.released).to.equal(0n);

    //   // funds actually moved
    //   expect(await token.balanceOf(owner.address)).to.equal(1_000_000_000n * WAD - amount);
    //   expect(await token.balanceOf(await vesting.getAddress())).to.equal(amount);
    // });

    it("creates schedule, pulls tokens, updates indexes & emits", async () => {
      const { owner, alice, token, vesting } = await loadFixture(deployFixture);

      const amount = toWad(1_000);
      await token.approve(await vesting.getAddress(), amount);

      const now = await time.latest();
      const start = now + 3600;
      const cliff = 3600;
      const duration = 3600 * 24 * 180;
      const slice = 86400;

      const tx = await vesting.lock(
        alice.address,
        amount,
        start,
        cliff,
        duration,
        slice,
        true
      );
      const rc = await tx.wait();

      // try event first, else read from schedulesOf
      let ev = rc.logs.find((l) => l.fragment?.name === "ScheduleCreated");
      let id = ev?.args?.id;
      if (!id) {
        const ids = await vesting.schedulesOf(alice.address);
        id = ids[0];
      }

      expect(typeof id).to.equal("string");
      expect(id).to.match(/^0x[0-9a-fA-F]{64}$/);

      // indexes
      const ids = await vesting.schedulesOf(alice.address);
      expect(ids).to.deep.equal([id]);

      // totalLocked
      expect(await vesting.totalLocked()).to.equal(amount);

      // getSchedule view
      const s = await vesting.getSchedule(id);
      const [
        beneficiary_,
        start_,
        cliff_,
        duration_,
        slice_,
        revocable_,
        revoked_,
        revokedAt_,
        total_,
        released_,
      ] = s;

      expect(beneficiary_).to.equal(alice.address);
      expect(start_).to.equal(start);
      expect(cliff_).to.equal(cliff);
      expect(duration_).to.equal(duration);
      expect(slice_).to.equal(slice);
      expect(revocable_).to.equal(true);
      expect(revoked_).to.equal(false);
      expect(total_).to.equal(amount);
      expect(released_).to.equal(0n);

      // funds actually moved
      expect(await token.balanceOf(owner.address)).to.equal(
        1_000_000_000n * WAD - amount
      );
      expect(await token.balanceOf(await vesting.getAddress())).to.equal(
        amount
      );
    });

    it("validates params (zero addr, zero amount, bad cliff/slice/duration)", async () => {
      const { owner, token, vesting } = await loadFixture(deployFixture);
      await token.approve(await vesting.getAddress(), toWad(1000));

      const now = await time.latest();
      const start = now + 1;
      const amount = toWad(1);

      await expect(
        vesting.lock(ethers.ZeroAddress, amount, start, 0, 10, 1, true)
      ).to.be.revertedWithCustomError(vesting, "ZeroAddress");

      await expect(
        vesting.lock(owner.address, 0, start, 0, 10, 1, true)
      ).to.be.revertedWithCustomError(vesting, "InvalidParams");

      await expect(
        vesting.lock(owner.address, amount, start, 11, 10, 1, true)
      ).to.be.revertedWithCustomError(vesting, "InvalidParams"); // cliff > duration

      await expect(
        vesting.lock(owner.address, amount, start, 0, 10, 0, true)
      ).to.be.revertedWithCustomError(vesting, "InvalidParams"); // slice=0

      await expect(
        vesting.lock(owner.address, amount, start, 0, 10, 11, true)
      ).to.be.revertedWithCustomError(vesting, "InvalidParams"); // slice > duration
    });

    // it("works with non-standard tokens that don't return bool", async () => {
    //   const [owner, alice] = await ethers.getSigners();
    //   const NoRet = await ethers.getContractFactory("MockERC20NoReturn");
    //   const noret = await NoRet.deploy(1_000_000n * WAD, owner.address);
    //   await noret.waitForDeployment();

    //   const Vesting = await ethers.getContractFactory("MAGAFox47Vesting");
    //   const vesting = await Vesting.deploy(await noret.getAddress());
    //   await vesting.waitForDeployment();

    //   await (
    //     await noret.approve(await vesting.getAddress(), toWad(1000))
    //   ).wait();
    //   const now = await time.latest();

    //   await expect(
    //     vesting.lock(alice.address, toWad(100), now, 0, 1000, 1, false)
    //   ).to.not.be.reverted;
    // });

    // it("reverts with tokens that return false", async () => {
    //   const [owner, alice] = await ethers.getSigners();
    //   const FalseT = await ethers.getContractFactory("MockERC20False");
    //   const ft = await FalseT.deploy(1_000_000n * WAD, owner.address);
    //   await ft.waitForDeployment();

    //   const Vesting = await ethers.getContractFactory("MAGAFox47Vesting");
    //   const vesting = await Vesting.deploy(await ft.getAddress());
    //   await vesting.waitForDeployment();

    //   await (await ft.approve(await vesting.getAddress(), toWad(1000))).wait();
    //   const now = await time.latest();

    //   await expect(
    //     vesting.lock(alice.address, toWad(100), now, 0, 1000, 1, false)
    //   ).to.be.revertedWith("SafeERC20: transferFrom failed");
    // });
  });

  describe("lockBatch()", () => {
    it("batch creates schedules & upfront pulls funds", async () => {
      const { owner, alice, bob, token, vesting } = await loadFixture(
        deployFixture
      );

      const amounts = [toWad(100), toWad(200)];
      const sum = amounts[0] + amounts[1];
      await token.approve(await vesting.getAddress(), sum);

      const now = await time.latest();
      const starts = [now + 10, now + 10];
      const cliffs = [0, 0];
      const durations = [1000, 2000];
      const slices = [1, 10];
      const revoc = [true, false];

      const tx = await vesting.lockBatch(
        [alice.address, bob.address],
        amounts,
        starts,
        cliffs,
        durations,
        slices,
        revoc
      );
      const rc = await tx.wait();
      const created = rc.logs.filter(
        (l) => l.fragment?.name === "ScheduleCreated"
      );
      expect(created.length).to.eq(2);

      expect(await token.balanceOf(owner.address)).to.equal(
        1_000_000_000n * WAD - sum
      );
      expect(await token.balanceOf(await vesting.getAddress())).to.equal(sum);
      expect(await vesting.totalLocked()).to.equal(sum);

      expect((await vesting.schedulesOf(alice.address)).length).to.eq(1);
      expect((await vesting.schedulesOf(bob.address)).length).to.eq(1);
    });

    it("validates array lengths and non-empty", async () => {
      const { token, vesting, owner } = await loadFixture(deployFixture);
      await token.approve(await vesting.getAddress(), toWad(1000));
      const now = await time.latest();

      await expect(
        vesting.lockBatch([], [], [], [], [], [], [])
      ).to.be.revertedWithCustomError(vesting, "InvalidParams");

      await expect(
        vesting.lockBatch([owner.address], [toWad(1)], [now], [0], [1], [1], [])
      ).to.be.revertedWithCustomError(vesting, "InvalidParams");
    });
  });

  describe("release()", () => {
    async function createVestingFor(who, amount, params = {}) {
      const { owner, token, vesting } = await loadFixture(deployFixture);
      const now = await time.latest();
      const start = params?.start ?? now;
      const cliff = params?.cliff ?? 3600;
      const duration = params?.duration ?? 3600 * 24 * 30;
      const slice = params?.slice ?? 3600;
      const revocable = params?.revocable ?? true;

      await token.approve(await vesting.getAddress(), amount);
      const tx = await vesting.lock(
        who,
        amount,
        start,
        cliff,
        duration,
        slice,
        revocable
      );
      const rc = await tx.wait();
      const ev = rc.logs.find((l) => l.fragment?.name === "ScheduleCreated");
      const id = ev.args.id;

      return {
        id,
        start,
        cliff,
        duration,
        slice,
        amount,
        vesting,
        token,
        owner,
      };
    }

    it("only beneficiary or owner can release; respects `to`", async () => {
      const { alice, bob, stranger } = await loadFixture(deployFixture);
      const { id, vesting } = await createVestingFor(alice.address, toWad(100));

      // nobody releases before cliff/time -> revert NothingToRelease
      await expect(
        vesting.connect(alice).release(id, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(vesting, "NothingToRelease");

      // stranger cannot release
      await expect(
        vesting.connect(stranger).release(id, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(vesting, "NotAuthorized");

      // jump beyond cliff a bit
      const s = await vesting.getSchedule(id);
      // tuple layout: [0]=beneficiary, [1]=start, [2]=cliff, [3]=duration, [4]=slice, [5]=revocable, [6]=revoked, [7]=revokedAt, [8]=total, [9]=released
      const start_ = s[1]; // bigint
      const cliff_ = s[2]; // bigint

      // move time to just past start + cliff
      await jumpTo(start_ + cliff_ + 10n);

      // owner can release to custom recipient
      await expect(vesting.release(id, bob.address)).to.emit(
        vesting,
        "TokensReleased"
      );
    });

    it("linear vesting with slice flooring", async () => {
      const { alice } = await loadFixture(deployFixture);
      const amount = toWad(90);
      const cliff = 10;
      const duration = 90;
      const slice = 10;

      const { id, start, vesting, token } = await createVestingFor(
        alice.address,
        amount,
        { cliff, duration, slice }
      );

      // before cliff -> 0
      await jumpTo(start + cliff - 1);
      expect(await vesting.releasableAmount(id)).to.equal(0n);

      // at cliff -> floor to one slice (10/90) => 10/90 * 90 = 10 vested
      await jumpTo(start + cliff);
      let exp = expectedVested(
        amount,
        start,
        cliff,
        duration,
        slice,
        start + cliff
      );
      expect(exp).to.equal(toWad(10)); // 10 tokens (since total=90 and duration=90 => 1 per second, slice 10 => 10)
      await expect(vesting.connect(alice).release(id, ethers.ZeroAddress))
        .to.emit(vesting, "TokensReleased")
        .withArgs(id, alice.address, alice.address, exp);

      // halfway (+45s): slice floors to 40 -> vested = 40
      await jumpTo(start + 45);
      exp = expectedVested(amount, start, cliff, duration, slice, start + 45);
      expect(exp).to.equal(toWad(40));
      const schedMid = await await vesting.getSchedule(id);
      const releasedSoFar = schedMid[9]; // tuple index for 'released'
      const toRelease = exp - releasedSoFar;
      await expect(vesting.connect(alice).release(id, ethers.ZeroAddress))
        .to.emit(vesting, "TokensReleased")
        .withArgs(id, alice.address, alice.address, toRelease);

      // at end
      await jumpTo(start + duration);
      exp = expectedVested(
        amount,
        start,
        cliff,
        duration,
        slice,
        start + duration
      );
      expect(exp).to.equal(amount);
      const schedEnd = await await vesting.getSchedule(id);
      const relEnd = schedEnd[9];
      await expect(vesting.connect(alice).release(id, ethers.ZeroAddress))
        .to.emit(vesting, "TokensReleased")
        .withArgs(id, alice.address, alice.address, exp - relEnd);

      // balances match total
      expect(await token.balanceOf(alice.address)).to.equal(amount);
    });

    // it("releasing multiple schedules aggregates in view", async () => {
    //   const { alice } = await loadFixture(deployFixture);
    //   const A = await createVestingFor(alice.address, toWad(100), {
    //     cliff: 0,
    //     duration: 100,
    //     slice: 1,
    //   });
    //   const B = await createVestingFor(alice.address, toWad(50), {
    //     cliff: 0,
    //     duration: 50,
    //     slice: 5,
    //   });

    //   await jumpTo(A.start + 25);
    //   const sum = await A.vesting.releasableAmountFor(alice.address);
    //   // const expA = expectedVested(A.amount, A.start, 0, A.duration, 1, A.start + 25) - (await A.vesting.getSchedule(A.id)).released;
    //   // const expB = expectedVested(B.amount, B.start, 0, B.duration, 5, B.start + 25) - (await B.vesting.getSchedule(B.id)).released;
    //   const sA = await A.vesting.getSchedule(A.id);
    //   const relA = sA[9];

    //   const sB = await B.vesting.getSchedule(B.id);
    //   const relB = sB[9];
    //   const expA =
    //     expectedVested(A.amount, A.start, 0, A.duration, 1, A.start + 25) -
    //     relA;
    //   const expB =
    //     expectedVested(B.amount, B.start, 0, B.duration, 5, B.start + 25) -
    //     relB;

    //   expect(sum).to.equal(expA + expB);
    // });

    it("releasing multiple schedules aggregates in view", async () => {
      // one deployment for both schedules
      const ctx = await loadFixture(deployFixture);
      const { alice, vesting } = ctx;

      // create both schedules on the SAME vesting
      const A = await createVestingOn(ctx, alice.address, toWad(100), {
        cliff: 0,
        duration: 100,
        slice: 1,
      });
      const B = await createVestingOn(ctx, alice.address, toWad(50), {
        cliff: 0,
        duration: 50,
        slice: 5,
      });

      // jump to a single timestamp (use the same 't' for both)
      const t = A.start + 25; // if A.start is bigint, use: const t = BigInt(A.start) + 25n;
      await jumpTo(t);

      // contract aggregate
      const sum = await vesting.releasableAmountFor(alice.address);

      // read released so far (both zero here, but read from tuple idx 9 for correctness)
      const sA = await vesting.getSchedule(A.id);
      const sB = await vesting.getSchedule(B.id);
      const relA = sA[9];
      const relB = sB[9];

      // expected using the SAME 't' for both schedules
      const expA =
        expectedVested(A.amount, A.start, 0, A.duration, 1, t) - relA;
      const expB =
        expectedVested(B.amount, B.start, 0, B.duration, 5, t) - relB;

      expect(sum).to.equal(expA + expB);
    });
  });

  describe("revoke()", () => {
    it("only owner; only revocable; cannot double revoke", async () => {
      const { alice, stranger } = await loadFixture(deployFixture);
      const ctx = await createVestingFor(alice.address, toWad(100), {
        revocable: true,
      });

      await expect(
        ctx.vesting.connect(stranger).revoke(ctx.id)
      ).to.be.revertedWithCustomError(
        ctx.vesting,
        "OwnableUnauthorizedAccount"
      );

      await expect(ctx.vesting.revoke(ctx.id)).to.not.be.reverted;

      await expect(ctx.vesting.revoke(ctx.id)).to.be.revertedWithCustomError(
        ctx.vesting,
        "AlreadyRevoked"
      );
    });

    it("pays vested to beneficiary and returns unvested to owner", async () => {
      const { owner, alice, token } = await loadFixture(deployFixture);
      const amount = toWad(1000);
      const cliff = 0,
        duration = 1000,
        slice = 10;
      const { id, start, vesting } = await createVestingFor(
        alice.address,
        amount,
        { cliff, duration, slice, revocable: true }
      );

      await jumpTo(start + 250); // 25% vested (floored to 250)
      const vested = expectedVested(
        amount,
        start,
        cliff,
        duration,
        slice,
        start + 250
      );

      const balBeforeOwner = await token.balanceOf(owner.address);
      const balBeforeAlice = await token.balanceOf(alice.address);
      const lockedBefore = await vesting.totalLocked();

      await expect(vesting.revoke(id)).to.emit(vesting, "ScheduleRevoked");

      const balAfterOwner = await token.balanceOf(owner.address);
      const balAfterAlice = await token.balanceOf(alice.address);
      const s = await vesting.getSchedule(id);
      const revoked_ = s[6]; // bool revoked
      const released_ = s[9];
      expect(revoked_).to.eq(true);

      // released equals vested at revoke
      expect(released_).to.equal(vested);

      // owner got unvested back
      const unvested = amount - vested;
      expect(balAfterOwner - balBeforeOwner).to.equal(unvested);

      // alice got vested remainder
      expect(balAfterAlice - balBeforeAlice).to.equal(vested);

      // locked decreased by total (vested moved out, unvested returned)
      expect(lockedBefore - (await vesting.totalLocked())).to.equal(amount);
    });

    it("revoking after full vest returns nothing and just marks revoked", async () => {
      const { alice } = await loadFixture(deployFixture);
      const amount = toWad(42);
      const { id, start, vesting } = await createVestingFor(
        alice.address,
        amount,
        { cliff: 0, duration: 100, slice: 10, revocable: true }
      );

      await jumpTo(start + 100);
      await expect(vesting.revoke(id)).to.not.be.reverted;

      const s = await vesting.getSchedule(id);
      const released_ = s[9];
      expect(released_).to.equal(amount);
    });

    it("non-revocable schedule cannot be revoked", async () => {
      const { alice } = await loadFixture(deployFixture);
      const { id, vesting } = await createVestingFor(alice.address, toWad(10), {
        revocable: false,
      });
      await expect(vesting.revoke(id)).to.be.revertedWithCustomError(
        vesting,
        "NotRevocable"
      );
    });
  });

  describe("fund() and withdrawSurplus()", () => {
    it("fund adds buffer; withdrawSurplus respects totalLocked", async () => {
      const { owner, token, vesting, alice, treasury } = await loadFixture(
        deployFixture
      );
      // lock 100
      await token.approve(await vesting.getAddress(), toWad(100));
      const now = await time.latest();
      await vesting.lock(alice.address, toWad(100), now, 0, 100, 5, true);

      // add surplus 50
      await token.approve(await vesting.getAddress(), toWad(50));
      await expect(vesting.fund(toWad(50))).to.emit(vesting, "Funded");

      const bal = await token.balanceOf(await vesting.getAddress());
      expect(bal).to.equal(toWad(150));
      expect(await vesting.totalLocked()).to.equal(toWad(100));

      // cannot withdraw more than surplus (50)
      await expect(
        vesting.withdrawSurplus(treasury.address, toWad(60))
      ).to.be.revertedWith("Exceeds surplus");

      await expect(vesting.withdrawSurplus(treasury.address, toWad(50)))
        .to.emit(vesting, "SurplusWithdrawn")
        .withArgs(treasury.address, toWad(50));

      expect(await token.balanceOf(treasury.address)).to.equal(toWad(50));
      expect(await token.balanceOf(await vesting.getAddress())).to.equal(
        toWad(100)
      );
    });

    it("reverts on zero to", async () => {
      const { token, vesting } = await loadFixture(deployFixture);
      await token.approve(await vesting.getAddress(), toWad(1));
      await vesting.fund(toWad(1));
      await expect(
        vesting.withdrawSurplus(ethers.ZeroAddress, 1n)
      ).to.be.revertedWithCustomError(vesting, "ZeroAddress");
    });
  });

  // describe("recoverERC20()", () => {
  //   it("can recover foreign tokens but not the vesting token", async () => {
  //     const { owner, token, vesting } = await loadFixture(deployFixture);

  //     // send a foreign token to the vesting contract and recover it
  //     const Foreign = await ethers.getContractFactory("MockERC20");
  //     const foreign = await Foreign.deploy("USDX", "USDX", toWad(1000), owner.address);
  //     await foreign.waitForDeployment();

  //     await foreign.transfer(await vesting.getAddress(), toWad(123));
  //     expect(await foreign.balanceOf(await vesting.getAddress())).to.equal(toWad(123));

  //     await expect(
  //       vesting.recoverERC20(await token.getAddress(), owner.address, 1n)
  //     ).to.be.revertedWithCustomError(vesting, "TokenIsVestingToken");

  //     await expect(
  //       vesting.recoverERC20(await foreign.getAddress(), owner.address, toWad(100))
  //     ).to.not.be.reverted;

  //     expect(await foreign.balanceOf(owner.address)).to.equal(toWad(1000) - toWad(123) + toWad(100));
  //     expect(await foreign.balanceOf(await vesting.getAddress())).to.equal(toWad(23));
  //   });
  // });

  describe("recoverERC20()", () => {
    it("can recover foreign tokens but not the vesting token", async () => {
      const { owner, token, vesting } = await loadFixture(deployFixture);

      // Deploy a SECOND MagaFox47 to act as a "foreign" ERC20
      const Foreign = await ethers.getContractFactory("MagaFox47");
      const foreign = await Foreign.deploy(
        "USDX",
        "USDX",
        toWad(1_000_000), // used only for tokenomics math
        "ipfs://foreign",
        zeros10()
      );
      await foreign.waitForDeployment();

      // Enable minting and mint actual test balance to owner
      await (await foreign.setContractState(1, true)).wait(); // enable minting
      await (
        await foreign.mintWithoutRestriction(owner.address, toWad(1000))
      ).wait();

      // Send some foreign tokens to the vesting contract
      await (
        await foreign.transfer(await vesting.getAddress(), toWad(123))
      ).wait();
      expect(await foreign.balanceOf(await vesting.getAddress())).to.equal(
        toWad(123)
      );

      // Cannot recover the vesting's own token
      await expect(
        vesting.recoverERC20(await token.getAddress(), owner.address, 1n)
      ).to.be.revertedWithCustomError(vesting, "TokenIsVestingToken");

      // Can recover truly foreign tokens
      await expect(
        vesting.recoverERC20(
          await foreign.getAddress(),
          owner.address,
          toWad(100)
        )
      ).to.not.be.reverted;

      // Owner got 100 back; vesting retains 23
      expect(await foreign.balanceOf(owner.address)).to.equal(
        toWad(1000) - toWad(123) + toWad(100)
      );
      expect(await foreign.balanceOf(await vesting.getAddress())).to.equal(
        toWad(23)
      );
    });
  });

    describe("views & not-found", () => {
      it("vestedAmount/releasable follow time and cap at revoke", async () => {
        const { alice } = await loadFixture(deployFixture);
        const amount = toWad(1000);
        const cliff = 100, duration = 1000, slice = 25;
        const { id, start, vesting } = await createVestingFor(alice.address, amount, { cliff, duration, slice, revocable: true });

        await jumpTo(start + 500);
        const v500 = await vesting.vestedAmount(id, start + 500);
        expect(v500).to.equal(expectedVested(amount, start, cliff, duration, slice, start + 500));

        await vesting.revoke(id);
        const s = await vesting.getSchedule(id);

        // past revoke => cap at revokedAt
        const v900 = await vesting.vestedAmount(id, start + 900);
        expect(v900).to.equal(expectedVested(amount, start, cliff, duration, slice, start + 900, s.revokedAt));
      });

      it("ScheduleNotFound on unknown id", async () => {
        const { vesting } = await loadFixture(deployFixture);
        const fake = ethers.id("nope");
        await expect(vesting.getSchedule(fake)).to.be.revertedWithCustomError(vesting, "ScheduleNotFound");
        await expect(vesting.releasableAmount(fake)).to.be.revertedWithCustomError(vesting, "ScheduleNotFound");
        await expect(vesting.vestedAmount(fake, 0)).to.be.revertedWithCustomError(vesting, "ScheduleNotFound");
      });
    });

    describe("end-to-end scenario", () => {
      it("team & advisors distribution lifecycle with partial revokes and surplus sweep", async () => {
        const { owner, token, vesting, alice, bob, carol, treasury } = await loadFixture(deployFixture);
        // Pre-fund large allowance and keep some surplus in contract.
        await token.approve(await vesting.getAddress(), toWad(10_000));
        await vesting.fund(toWad(2_000)); // surplus buffer

        const now = await time.latest();
        const N = now + 1;

        // Create 3 schedules (team/advisors/liquidity)
        const tx = await vesting.lockBatch(
          [alice.address, bob.address, carol.address],
          [toWad(3000), toWad(1500), toWad(1000)],
          [N, N, N],
          [0, 60*60*24*30, 0],                 // bob has 30d cliff
          [60*60*24*365, 60*60*24*365, 90*24*60*60], // 1y, 1y, 90d
          [60*60*24, 60*60*24, 60*60*24],      // daily slices
          [true, false, true]
        );
        const rc = await tx.wait();
        const ids = rc.logs.filter((l)=> (l).fragment?.name === "ScheduleCreated").map((l)=> l.args.id );

        expect(await vesting.totalLocked()).to.equal(toWad(3000 + 1500 + 1000));

        // After ~45 days, Alice & Carol release; Bob is still under cliff (30d -> now 45d => ok)
        await jumpTo(N + 45*24*60*60);

        // Alice release to herself
        const relAliceBefore = (await vesting.getSchedule(ids[0])).released;
        await expect(vesting.connect(alice).release(ids[0], ethers.ZeroAddress))
          .to.emit(vesting, "TokensReleased");
        const relAliceAfter = (await vesting.getSchedule(ids[0])).released;
        expect(relAliceAfter).to.be.greaterThan(relAliceBefore);

        // Bob after cliff (45d > 30d), owner releases to treasury (custom `to`)
        await expect(vesting.release(ids[1], treasury.address))
          .to.emit(vesting, "TokensReleased");

        // Carol gets revoked at ~day 45 (pay vested, return unvested)
        const beforeTL = await vesting.totalLocked();
        await expect(vesting.revoke(ids[2])).to.emit(vesting, "ScheduleRevoked");
        const afterTL = await vesting.totalLocked();
        // locked decreased by full amount of Carol's schedule
        expect(beforeTL - afterTL).to.equal(toWad(1000));

        // Sweep any surplus (we pre-funded 2000; carol returned unvested -> increases surplus)
        const balContract = await token.balanceOf(await vesting.getAddress());
        const surplus = balContract - (await vesting.totalLocked());
        expect(surplus).to.be.greaterThan(0n);
        await expect(vesting.withdrawSurplus(owner.address, surplus)).to.emit(vesting, "SurplusWithdrawn");

        // Fast forward to 1 year and finish Alice/Bob
        await jumpTo(N + 366*24*60*60);
        await expect(vesting.connect(alice).release(ids[0], ethers.ZeroAddress)).to.not.be.reverted;
        await expect(vesting.release(ids[1], ethers.ZeroAddress)).to.not.be.reverted;

        const sA = await vesting.getSchedule(ids[0]);
        const sB = await vesting.getSchedule(ids[1]);
        expect(sA.released).to.equal(toWad(3000));
        expect(sB.released).to.equal(toWad(1500));
      });
    });
});
