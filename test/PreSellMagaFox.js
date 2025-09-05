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

import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;

function toWad(n) {
  return ethers.parseUnits(String(n), 18);
}

const zeros10 = () => new Array(10).fill(ethers.ZeroAddress);

describe("PreSellMagaFox", function () {
  let token, vesting, presale;
  let owner, user1, user2, treasury;

  beforeEach(async () => {
    [owner, user1, user2, treasury] = await ethers.getSigners();

    // Deploy Token
    const Token = await ethers.getContractFactory("MagaFox47");
    const tokenName = "MagaFox47";
    const tokenSymbol = "MF47";
    const initialSupplyForTokenomics = toWad(1_000_000_000);
    const imageURI =
      "https://bafkreieonkqpkf26xqbyqnxpguzna6rizwndsdh4t35usjce5d5fhqc37q.ipfs.dweb.link/";
    const initialWallets = zeros10();

    token = await Token.deploy(
      tokenName,
      tokenSymbol,
      initialSupplyForTokenomics,
      imageURI,
      initialWallets
    );
    await token.waitForDeployment();

    // Enable minting & mint supply to owner
    await token.setContractState(1, true);
    await token.mintWithoutRestriction(owner.address, toWad(1_000_000_000));

    // Deploy Vesting
    const Vesting = await ethers.getContractFactory("MAGAFox47Vesting");
    vesting = await Vesting.deploy(await token.getAddress());

    // Deploy Presale
    const vt = {
      startDelay: 0,
      cliff: 0,
      duration: 3600,
      slice: 60,
      revocable: false,
    };
    const PreSell = await ethers.getContractFactory("PreSellMagaFox");
    presale = await PreSell.deploy(
      await token.getAddress(),
      await vesting.getAddress(),
      treasury.address,
      ethers.parseEther("0.001"),
      Math.floor(Date.now() / 1000) - 10,
      Math.floor(Date.now() / 1000) + 86400,
      ethers.parseEther("10"),
      ethers.parseEther("0.01"),
      ethers.parseEther("5"),
      vt
    );

    // Fund presale
    const tokensForSale = ethers.parseEther("1000000");
    await token.transfer(await presale.getAddress(), tokensForSale);
    await presale.approveVesting(tokensForSale);
    await presale.setWhitelistEnabled(true);
await presale.setWhitelist([user1.address], true);

    // ✅ allow presale to create vesting schedules
    // await vesting.setLocker(await presale.getAddress(), true);
  });

  it("should allow user to buy tokens and create vesting schedule", async () => {
    const weiToSpend = ethers.parseEther("0.1");
    await expect(
      presale.connect(user1).PurchasedToken(user1.address, { value: weiToSpend })
    ).to.emit(presale, "Purchased");

    expect(await presale.spent(user1.address)).to.equal(weiToSpend);
    expect(await presale.totalRaisedWei()).to.equal(weiToSpend);
  });

  it("should enforce min and max per wallet", async () => {
    await expect(
      presale
        .connect(user1)
        .PurchasedToken(user1.address, { value: ethers.parseEther("0.001") })
    ).to.be.revertedWithCustomError(presale, "AmountTooSmall");

    await expect(
      presale
        .connect(user1)
        .PurchasedToken(user1.address, { value: ethers.parseEther("6") })
    ).to.be.revertedWithCustomError(presale, "AmountTooLarge");
  });

  it("should not exceed hard cap", async () => {

      await presale.setWhitelist([user1.address, user2.address], true); 

    
    await presale
      .connect(user1)
      .PurchasedToken(user1.address, { value: ethers.parseEther("5") });
    await expect(
      presale
        .connect(user2)
        .PurchasedToken(user2.address, { value: ethers.parseEther("6") })
    ).to.be.revertedWithCustomError(presale, "CapExceeded");
  });

  it("should forward raised funds to treasury", async () => {
    const before = await ethers.provider.getBalance(treasury.address);
    await presale
      .connect(user1)
      .PurchasedToken(user1.address, { value: ethers.parseEther("1") });
    const after = await ethers.provider.getBalance(treasury.address);
    expect(after - before).to.equal(ethers.parseEther("1"));
  });

  it("should respect whitelist if enabled", async () => {
    await presale.setWhitelistEnabled(true);
    await expect(
      presale
        .connect(user1)
        .PurchasedToken(user1.address, { value: ethers.parseEther("1") })
    ).to.be.revertedWithCustomError(presale, "NotWhitelisted");

    await presale.setWhitelist([user1.address], true);
    await expect(
      presale
        .connect(user1)
        .PurchasedToken(user1.address, { value: ethers.parseEther("1") })
    ).to.emit(presale, "Purchased");
  });
});
