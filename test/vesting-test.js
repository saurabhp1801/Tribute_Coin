

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
    console.log("Deploying with:", owner.address);
    console.log("Owner:", owner.address);
    console.log("alice", alice.address);
    console.log("bob", bob.address);
    console.log("carol", carol.address);
    console.log("treasury", treasury.address);
    console.log("stranger", stranger.address);
    console.log("Other signers:", alice.address, bob.address, carol.address, treasury.address, stranger.address);
    
    

  // Deploy your real token
  const Token = await ethers.getContractFactory("MagaFox47"); // <- exact name from your contract
  const name = "MagaFox47";
  const symbol = "MF47";
  const initialSupplyForTokenomics = toWad(1_000_000_000); // used for tokenomics math only
  const imageURI = "https://bafkreieonkqpkf26xqbyqnxpguzna6rizwndsdh4t35usjce5d5fhqc37q.ipfs.dweb.link/";
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


/// here






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

      //converts 1000 tokens to wei (smallest unit)
      const amount = toWad(1_000);
      //MagaFox47  needs prior approval → This line gives vesting contract permission to spend 1000 tokens from owner.
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
      // await expect(
      //   vesting.withdrawSurplus(treasury.address, toWad(60))
      // ).to.be.revertedWith("Exceeds surplus");

      await expect(
  vesting.withdrawSurplus(treasury.address, toWad(60))
).to.be.revertedWithCustomError(vesting, "ExceedsSurplus");

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
