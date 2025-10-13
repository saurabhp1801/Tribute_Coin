import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;

const zeros10 = () => new Array(10).fill(ethers.ZeroAddress);
const ONE = 1n;
const WAD = 10n ** 18n;

function toWad(n) {
  return ethers.parseUnits(String(n), 18);
}

describe("ProtocolFeeWallet", function () {
  let Token, token;
  let MockRouter, mockRouter;
  let ProtocolFeeWallet, feeWallet;
  let owner, charity, liquidity, protocol, user;

  beforeEach(async function () {
    [owner, charity, liquidity, protocol, user] = await ethers.getSigners();

    const TokenFactory = await ethers.getContractFactory("MagaFox47");
    token = await TokenFactory.deploy(
      "MagaFox47",
      "MF47",
      ethers.parseUnits("1000000000", 18), // 1B
      "https://bafkreieonkqpkf26xqbyqnxpguzna6rizwndsdh4t35usjce5d5fhqc37q.ipfs.dweb.link/",
      Array(10).fill(ethers.ZeroAddress)
    );
    await token.waitForDeployment();
    await token.setContractState(1, true); // 1 = Minting status

    // ✅ mint to owner so they can transfer
    await token.mint(owner.address, ethers.parseUnits("5000", 18), false);

    // --- Deploy a mock Router ---
    MockRouter = await ethers.getContractFactory("MockRouter");
    mockRouter = await MockRouter.deploy();
    await mockRouter.waitForDeployment();

    // ✅ Fund router with ETH so it can "swap"
    await owner.sendTransaction({
      to: await mockRouter.getAddress(),
      value: ethers.parseEther("100"),
    });

    // --- Deploy ProtocolFeeWallet ---
    ProtocolFeeWallet = await ethers.getContractFactory("ProtocolFeeWallet");
    feeWallet = await ProtocolFeeWallet.deploy(
      await token.getAddress(),
      await mockRouter.getAddress(),
      charity.address,
      liquidity.address,
      protocol.address
    );
    await feeWallet.waitForDeployment();

    // ✅ Fund ProtocolFeeWallet with tokens
    await token.transfer(
      await feeWallet.getAddress(),
      ethers.parseUnits("1000", 18)
    );
  });

  describe("Deployment", function () {
    it("sets token, router and wallets correctly", async function () {
      expect(await feeWallet.token()).to.equal(await token.getAddress());
      expect(await feeWallet.router()).to.equal(await mockRouter.getAddress());
      expect(await feeWallet.charityWallet()).to.equal(charity.address);
      expect(await feeWallet.liquidityWallet()).to.equal(liquidity.address);
      expect(await feeWallet.protocolWallet()).to.equal(protocol.address);
    });
  });

  describe("Update functions", function () {
    it("updates wallets", async function () {
      await feeWallet.updateWallets(
        user.address,
        ethers.ZeroAddress,
        ethers.ZeroAddress
      );
      expect(await feeWallet.charityWallet()).to.equal(user.address);
    });

    // it("updates percents and reverts if not summing 100", async function () {
    //   await feeWallet.updatePercents(20, 30, 50); // sums to 100
    //   expect(await feeWallet.charityPercent()).to.equal(20);

    //   await expect(feeWallet.updatePercents(50, 60, 10)).to.be.revertedWith("Percents must sum 100");
    // });
  });

  describe("Emergency withdraw", function () {
    it("allows owner to withdraw tokens + ETH", async function () {
      await feeWallet.emergencyWithdraw(owner.address);
      expect(await token.balanceOf(await feeWallet.getAddress())).to.equal(0);
    });

    it("reverts on zero address", async function () {
      await expect(
        feeWallet.emergencyWithdraw(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });
  });

//   describe("Swap and Distribute", function () {
//     it("distributes correctly with a specific amount", async function () {
//       // ✅ Fund router with ETH so it can "swap"
//       await owner.sendTransaction({
//         to: await mockRouter.getAddress(),
//         value: ethers.parseEther("100"),
//       });
//       const amount = ethers.parseUnits("200", 18);

//       await expect(feeWallet.swapAndDistribute(amount))
//         .to.emit(feeWallet, "FeesSwapped")
//         .withArgs(amount, amount)
//         .and.to.emit(feeWallet, "FeesDistributed");

//       // Tokens should be reduced in feeWallet
//       const balance = await token.balanceOf(await feeWallet.getAddress());
//       expect(balance).to.be.lessThan(ethers.parseUnits("1000", 18));
//     });

//     it("distributes correctly when amount = 0 (full balance)", async function () {
//       const fullBalance = await token.balanceOf(await feeWallet.getAddress());

//       await expect(feeWallet.swapAndDistribute(0))
//         .to.emit(feeWallet, "FeesSwapped")
//         .withArgs(fullBalance, fullBalance)
//         .and.to.emit(feeWallet, "FeesDistributed");

//       expect(await token.balanceOf(await feeWallet.getAddress())).to.equal(0);
//     });

//     it("reverts if no tokens available", async function () {
//       // withdraw all tokens
//       await feeWallet.emergencyWithdraw(owner.address);

//       await expect(feeWallet.swapAndDistribute(0)).to.be.revertedWith(
//         "No tokens to swap"
//       );
//     });
//   });
   describe("Swap and Distribute", function () {
    it("distributes correctly with a specific amount", async function () {
      const amount = toWad(200); // 200 tokens
      const expectedEthOut = amount / 100n; // 100 tokens = 1 ETH

      await expect(feeWallet.swapAndDistribute(amount))
        .to.emit(feeWallet, "FeesSwapped")
        .withArgs(amount, expectedEthOut)
        .and.to.emit(feeWallet, "FeesDistributed");

      const balance = await token.balanceOf(await feeWallet.getAddress());
      expect(balance).to.be.lessThan(toWad(1000));
    });

    it("distributes correctly when amount = 0 (full balance)", async function () {
      const fullBalance = await token.balanceOf(await feeWallet.getAddress());
      const expectedEthOut = fullBalance / 100n;

      await expect(feeWallet.swapAndDistribute(0))
        .to.emit(feeWallet, "FeesSwapped")
        .withArgs(fullBalance, expectedEthOut)
        .and.to.emit(feeWallet, "FeesDistributed");

      expect(await token.balanceOf(await feeWallet.getAddress())).to.equal(0);
    });

    it("reverts if no tokens available", async function () {
      await feeWallet.emergencyWithdraw(owner.address); // empty wallet

      await expect(feeWallet.swapAndDistribute(0))
        .to.be.revertedWith("No tokens to swap");
    });
  });
});
