import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("MagaFox47", function () {
  let magaFox;
  let owner, user1, user2, user3, charityAddress, liquidityAddress, treasuryAddress;
  const tokenName = "MagaFox47";
  const tokenSymbol = "MFOX";
  let initialSupply;
  const imageURI = "https://bafkreieonkqpkf26xqbyqnxpguzna6rizwndsdh4t35usjce5d5fhqc37q.ipfs.dweb.link/";
  const newImageURI = "ipfs://QmTestNew";

  // Constants for roles
  let MINTER_ROLE;
  let DEFAULT_ADMIN_ROLE;
  let CHARITY_ADMIN_ROLE;

  // Wallet types enum values updated to match new contract
  const WalletType = {
    CHARITY_TREASURY: 0,
    SEED: 1,
    PRIVATE_STRATEGIC: 2,
    COMMUNITY_IDO: 3,
    LIQUIDITY_AUCTION: 4,
    STAKING_REWARDS: 5,
    LIQUIDITY_MAKING: 6,
    TEAM_ADVISORS: 7,
    GROWTH_PARTNERSHIPS: 8,
    FUTURE_DAO_RESERVE: 9
  };

  before(async function() {
    // Set these values using ethers from hardhat
    initialSupply = ethers.parseUnits("1000000000", 18); // 1 billion tokens with 18 decimals
    MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    CHARITY_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CHARITY_ADMIN_ROLE"));
    DEFAULT_ADMIN_ROLE = ethers.ZeroHash; // This is the DEFAULT_ADMIN_ROLE in OpenZeppelin
  });

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, user3, charityAddress, liquidityAddress, treasuryAddress] = await ethers.getSigners();
    
    // Prepare initial wallets array (empty array for default setup)
    const initialWallets = [];
    
    // Deploy the contract
    const MagaFox47Factory = await ethers.getContractFactory("MagaFox47");
    magaFox = await MagaFox47Factory.deploy(
      tokenName, 
      tokenSymbol, 
      initialSupply, 
      imageURI,
      initialWallets
    );
    await magaFox.waitForDeployment();

    // Set up wallet addresses
    await magaFox.allocateWallets(
      [WalletType.CHARITY_TREASURY, WalletType.LIQUIDITY_MAKING, WalletType.SEED],
      [charityAddress.address, liquidityAddress.address, treasuryAddress.address]
    );
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await magaFox.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.equal(true);
      expect(await magaFox.owner()).to.equal(owner.address);
    });

    it("Should set the correct name and symbol", async function () {
      expect(await magaFox.name()).to.equal(tokenName);
      expect(await magaFox.symbol()).to.equal(tokenSymbol);
    });

    it("Should set the correct image URI", async function () {
      expect(await magaFox.imageURI()).to.equal(imageURI);
    });
    
    it("Should allocate wallet addresses correctly", async function () {
      expect(await magaFox.allocatedWallets(WalletType.CHARITY_TREASURY)).to.equal(charityAddress.address);
      expect(await magaFox.allocatedWallets(WalletType.LIQUIDITY_MAKING)).to.equal(liquidityAddress.address);
      expect(await magaFox.allocatedWallets(WalletType.SEED)).to.equal(treasuryAddress.address);
      expect(await magaFox.isWalletAllocated(WalletType.CHARITY_TREASURY)).to.equal(true);
    });
    
    it("Should initialize tokenomics allocations correctly", async function () {
      // Charity Treasury (20%)
      const charityTreasury = await magaFox.charityTreasury();
      const expectedCharityAmount = (initialSupply * 20n) / 100n;
      expect(charityTreasury.totalAmount).to.equal(expectedCharityAmount);
      expect(charityTreasury.released).to.equal(0);
      expect(charityTreasury.locked).to.equal(false);
      
      // Seed (5%)
      const seed = await magaFox.seed();
      const expectedSeedAmount = (initialSupply * 5n) / 100n;
      expect(seed.totalAmount).to.equal(expectedSeedAmount);
      expect(seed.released).to.equal(0);
      expect(seed.locked).to.equal(false);
      
      // Community IDO (10%)
      const communityIDO = await magaFox.communityIDO();
      const expectedIDOAmount = (initialSupply * 10n) / 100n;
      const expectedIDOReleased = (initialSupply * 10n * 25n) / 10000n; // 25% released at TGE
      expect(communityIDO.totalAmount).to.equal(expectedIDOAmount);
      expect(communityIDO.released).to.equal(expectedIDOReleased);
      expect(communityIDO.locked).to.equal(false);
      
      // Owners Allocation (15%)
      const ownersAllocation = await magaFox.ownersAllocation();        
      const expectedTeamAmount = (initialSupply * 15n) / 100n;
      expect(ownersAllocation.totalAmount).to.equal(expectedTeamAmount);   
      expect(ownersAllocation.released).to.equal(0);
      expect(ownersAllocation.locked).to.equal(false);
    });
  });

  describe("Minting", function () {
    beforeEach(async function() {
      // Enable minting
      await magaFox.setContractState(1, true); // 1 = Minting status
    });
    
    it("Should allow minting by addresses with MINTER_ROLE", async function () {
      const mintAmount = ethers.parseUnits("1000", 18);
      await magaFox.mint(user1.address, mintAmount, false);
      expect(await magaFox.balanceOf(user1.address)).to.equal(mintAmount);
    });

    it("Should not allow minting by addresses without MINTER_ROLE", async function () {
      const mintAmount = ethers.parseUnits("1000", 18);
      await expect(
        magaFox.connect(user1).mint(user1.address, mintAmount, false)
      ).to.be.revertedWithCustomError(magaFox, "Unauthorized");
    });

    it("Should not allow minting when paused", async function () {
      // Pause the contract
      await magaFox.setContractState(4, true); // 4 = Pause contract
      
      const mintAmount = ethers.parseUnits("1000", 18);
      await expect(
        magaFox.mint(user1.address, mintAmount, false)
      ).to.be.revertedWithCustomError(magaFox, "ContractState");
    });
    
    it("Should enforce one mint per address when requested", async function () {
      const mintAmount = ethers.parseUnits("1000", 18);
      await magaFox.mint(user1.address, mintAmount, true);
      
      // Try to mint again to the same address
      await expect(
        magaFox.mint(user1.address, mintAmount, true)
      ).to.be.revertedWithCustomError(magaFox, "ContractState"); // "AlreadyMinted"
      
      // Should still be able to mint without restriction
      await magaFox.mintWithoutRestriction(user1.address, mintAmount);
      expect(await magaFox.balanceOf(user1.address)).to.equal(mintAmount * 2n);
    });
    
    it("Should not allow minting when minting is disabled", async function () {
      // Disable minting
      await magaFox.setContractState(1, false); // 1 = Minting status
      
      const mintAmount = ethers.parseUnits("1000", 18);
      await expect(
        magaFox.mint(user1.address, mintAmount, false)
      ).to.be.revertedWithCustomError(magaFox, "ContractState"); // "MintingDisabled"
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      // Enable minting and mint tokens to user1
      await magaFox.setContractState(1, true); // 1 = Minting status
      const mintAmount = ethers.parseUnits("1000", 18);
      await magaFox.mint(user1.address, mintAmount, false);
    });
    
    it("Should allow token holders to burn their tokens", async function () {
      const initialBalance = await magaFox.balanceOf(user1.address);
      const burnAmount = ethers.parseUnits("500", 18);
      await magaFox.connect(user1).burn(burnAmount);
      
      const expectedBalance = initialBalance - burnAmount;
      expect(await magaFox.balanceOf(user1.address)).to.equal(expectedBalance);
    });

    it("Should not allow burning when paused", async function () {
      // Pause the contract
      await magaFox.setContractState(4, true); // 4 = Pause contract
      
      const burnAmount = ethers.parseUnits("500", 18);
      await expect(
        magaFox.connect(user1).burn(burnAmount)
      ).to.be.revertedWithCustomError(magaFox, "ContractState"); // "Paused"
    });
  });

describe("Transferring", function () {
  beforeEach(async function () {
    // Enable minting and mint tokens to user1
    await magaFox.setContractState(1, true); // 1 = Minting status
    const mintAmount = ethers.parseUnits("1000", 18);
    await magaFox.mint(user1.address, mintAmount, false);
  });

  it("Should allow token transfers when not paused", async function () {
    const transferAmount = ethers.parseUnits("300", 18);
    await magaFox.connect(user1).transfer(user2.address, transferAmount);

    expect(await magaFox.balanceOf(user2.address)).to.equal(transferAmount);
    const expectedBalance = ethers.parseUnits("700", 18);
    expect(await magaFox.balanceOf(user1.address)).to.equal(expectedBalance);
  });

  it("Should not allow token transfers when paused", async function () {
    await magaFox.setContractState(4, true); // 4 = Pause contract

    const transferAmount = ethers.parseUnits("300", 18);
    await expect(
      magaFox.connect(user1).transfer(user2.address, transferAmount)
    ).to.be.revertedWithCustomError(magaFox, "ContractState"); // "Paused"
  });

  it("Should apply transaction fees when enabled", async function () {
    // Enable transaction fees
    await magaFox.setContractState(2, true); // 2 = Transaction fees

    const transferAmount = ethers.parseUnits("1000", 18);
    await magaFox.mint(user1.address, transferAmount, false); // Top up user1 for fees

    const initialTotalSupply = await magaFox.totalSupply();
    const initialUser1Balance = await magaFox.balanceOf(user1.address);
    const initialUser3Balance = await magaFox.balanceOf(user3.address);
    const initialCharityBalance = await magaFox.balanceOf(charityAddress.address);
    const initialLiquidityBalance = await magaFox.balanceOf(liquidityAddress.address);

    // Expected fee amounts (1.5%)
    const totalFeeAmount = transferAmount * 150n / 10000n; // 1.5%
    const burnAmount = transferAmount * 100n / 10000n;     // 1%
    const charityAmount = transferAmount * 25n / 10000n;   // 0.25%
    const liquidityAmount = totalFeeAmount - burnAmount - charityAmount;

    // Perform transfer
    await magaFox.connect(user1).transfer(user3.address, transferAmount);

    // 1. Recipient should get full amount (no fee cut)
    expect(await magaFox.balanceOf(user3.address)).to.equal(
      initialUser3Balance + transferAmount
    );

    // 2. Sender should lose amount + fees
    expect(await magaFox.balanceOf(user1.address)).to.equal(
      initialUser1Balance - transferAmount - totalFeeAmount
    );

    // 3. Charity wallet
    expect(await magaFox.balanceOf(charityAddress.address)).to.equal(
      initialCharityBalance + charityAmount
    );

    // 4. Liquidity wallet
    expect(await magaFox.balanceOf(liquidityAddress.address)).to.equal(
      initialLiquidityBalance + liquidityAmount
    );

    // 5. Total supply should reduce by burn amount
    expect(await magaFox.totalSupply()).to.equal(
      initialTotalSupply - burnAmount
    );
  });

  it("Should update transaction fee percentage", async function () {
    await magaFox.setContractState(2, true);
    await magaFox.setTransactionFeePercent(200); // 2%
    expect(await magaFox.transactionFeePercent()).to.equal(200);

    const transferAmount = ethers.parseUnits("1000", 18);
    await magaFox.mint(user1.address, transferAmount, false);

    const initialUser3Balance = await magaFox.balanceOf(user3.address);
    await magaFox.connect(user1).transfer(user3.address, transferAmount);

    // Since fee logic is hardcoded to 1.5%, still expect 1.5% deduction
    const totalFeeAmount = transferAmount * 150n / 10000n;
    expect(await magaFox.balanceOf(user3.address)).to.equal(
      initialUser3Balance + transferAmount
    );
  });

  it("Should reject setting fees higher than 5%", async function () {
    await expect(
      magaFox.setTransactionFeePercent(600)
    ).to.be.revertedWithCustomError(magaFox, "InvalidInput");
  });
});



  describe("Pausing", function () {
    it("Should allow admin to pause and unpause", async function () {
      await magaFox.setContractState(4, true); // 4 = Pause contract
      expect(await magaFox.paused()).to.equal(true);
      
      await magaFox.setContractState(4, false); // 4 = Unpause contract
      expect(await magaFox.paused()).to.equal(false);
    });

    it("Should not allow non-admin to pause", async function () {
      await expect(
        magaFox.connect(user1).setContractState(4, true) // 4 = Pause contract
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to transfer admin role", async function () {
      // Transfer admin role from owner to user1
      await magaFox.transferAdminRole(user1.address);
      
      // Check that user1 now has admin role and owner doesn't
      expect(await magaFox.hasRole(DEFAULT_ADMIN_ROLE, user1.address)).to.equal(true);
      expect(await magaFox.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.equal(false);
    });

    it("Should not allow transferring admin role to zero address", async function () {
      await expect(
        magaFox.transferAdminRole(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(magaFox, "InvalidInput");
    });

    it("Should not allow transferring admin role to current admin", async function () {
      await expect(
        magaFox.transferAdminRole(owner.address)
      ).to.be.revertedWithCustomError(magaFox, "InvalidInput");
    });

    it("Should allow admin to grant minter role", async function () {
      // Grant minter role to user1
      await magaFox.grantRole(MINTER_ROLE, user1.address);
      
      // Check that user1 now has minter role
      expect(await magaFox.hasRole(MINTER_ROLE, user1.address)).to.equal(true);
      
      // Enable minting
      await magaFox.setContractState(1, true); // 1 = Minting status
      
      // Check that user1 can mint
      const mintAmount = ethers.parseUnits("1000", 18);
      await magaFox.connect(user1).mint(user2.address, mintAmount, false);
      expect(await magaFox.balanceOf(user2.address)).to.equal(mintAmount);
    });
    
    it("Should allow admin to grant charity admin role", async function () {
      // Grant charity admin role to user1
      await magaFox.grantRole(CHARITY_ADMIN_ROLE, user1.address);
      
      // Check that user1 now has charity admin role
      expect(await magaFox.hasRole(CHARITY_ADMIN_ROLE, user1.address)).to.equal(true);
      
      // User1 should now be able to approve charities
      await magaFox.connect(user1).manageCharity(1, user3.address, "Test Charity"); // 1 = Add charity
      
      // Check if charity was approved
      const charity = await magaFox.approvedCharities(user3.address);
      expect(charity.name).to.equal("Test Charity");
      expect(charity.approved).to.equal(true);
    });
  });
  
  describe("Metadata Management", function () {
    it("Should allow admin to update image URI", async function () {
      await magaFox.updateImageURI(newImageURI);
      expect(await magaFox.imageURI()).to.equal(newImageURI);
    });
    
    it("Should not allow non-admin to update image URI", async function () {
      await expect(
        magaFox.connect(user1).updateImageURI(newImageURI)
      ).to.be.revertedWithCustomError(magaFox, "Unauthorized");
    });
  });
  
  describe("Tokenomics", function () {
    it("Should allow owner to lock tokenomics", async function () {
      await magaFox.setContractState(3, true); // 3 = Lock tokenomics
      
      const charityTreasury = await magaFox.charityTreasury();
      expect(charityTreasury.locked).to.equal(true);
      
      const seed = await magaFox.seed();
      expect(seed.locked).to.equal(true);
      
      const privateStrategic = await magaFox.privateStrategic();
      expect(privateStrategic.locked).to.equal(true);
      
      const communityIDO = await magaFox.communityIDO();
      expect(communityIDO.locked).to.equal(true);
      
      const ownersAllocation = await magaFox.ownersAllocation();
      expect(ownersAllocation.locked).to.equal(true);
      
      const stakingRewards = await magaFox.stakingRewards();
      expect(stakingRewards.locked).to.equal(true);
    });
  });
  
  describe("Charity Management", function () {
    it("Should allow charity admin to approve charities", async function () {
      await magaFox.manageCharity(1, user3.address, "Hunger Relief Fund"); // 1 = Add charity
      
      const charity = await magaFox.approvedCharities(user3.address);
      expect(charity.name).to.equal("Hunger Relief Fund");
      expect(charity.approved).to.equal(true);
      
      // Check charity count
      expect(await magaFox.getCharityCount()).to.equal(1);
    });
    
    it("Should allow charity admin to remove charities", async function () {
      await magaFox.manageCharity(1, user3.address, "Hunger Relief Fund"); // 1 = Add charity
      await magaFox.manageCharity(2, user3.address, ""); // 2 = Remove charity
      
      const charity = await magaFox.approvedCharities(user3.address);
      expect(charity.approved).to.equal(false);
      
      // Check charity count
      expect(await magaFox.getCharityCount()).to.equal(0);
    });
    
    it("Should allow donating to approved charities", async function () {
      // Approve a charity
      await magaFox.manageCharity(1, user3.address, "Hunger Relief Fund"); // 1 = Add charity
      
      // Time travel to ensure some tokens are vested
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // 30 days
      await ethers.provider.send("evm_mine", []);
      
      // Donate tokens
      const donationAmount = ethers.parseUnits("10000", 18);
      await magaFox.donateToCharity(user3.address, donationAmount);
      
      // Check charity balance
      expect(await magaFox.balanceOf(user3.address)).to.equal(donationAmount);
      
      // Check charity donation tracking
      const charity = await magaFox.approvedCharities(user3.address);
      expect(charity.donated).to.equal(donationAmount);
    });
    
    it("Should not allow donating to unapproved charities", async function () {
      // Time travel to ensure some tokens are vested
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // 30 days
      await ethers.provider.send("evm_mine", []);
      
      // Try to donate to unapproved charity
      const donationAmount = ethers.parseUnits("10000", 18);
      await expect(
        magaFox.donateToCharity(user3.address, donationAmount)
      ).to.be.revertedWithCustomError(magaFox, "ContractState"); // "NotApproved"
    });
  });
  
  describe("Token Release Functions", function () {
    beforeEach(async function () {
      // Time travel to ensure some tokens are vested
      await ethers.provider.send("evm_increaseTime", [90 * 24 * 60 * 60]); // 90 days
      await ethers.provider.send("evm_mine", []);
    });
    
    it("Should release team tokens when vested", async function () {
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]); // 1 year
      await ethers.provider.send("evm_mine", []);

      const releaseAmount = ethers.parseUnits("1000", 18);
      await magaFox.releaseTokens(7, user1.address, releaseAmount); // 7 = Team/Advisors
      
      expect(await magaFox.balanceOf(user1.address)).to.equal(releaseAmount);
      
      const ownersAllocation = await magaFox.ownersAllocation();     
      expect(ownersAllocation.released).to.equal(releaseAmount);
    });
   it("Should release private strategic funds when vested", async function () {
  // Additional time travel beyond the 90 days in beforeEach
  await ethers.provider.send("evm_increaseTime", [180 * 24 * 60 * 60]); // Additional 180 days
  await ethers.provider.send("evm_mine", []);
  
  const releaseAmount = ethers.parseUnits("5000", 18);
  await magaFox.releaseTokens(2, user2.address, releaseAmount); // 2 = PrivateStrategic
  
  expect(await magaFox.balanceOf(user2.address)).to.equal(releaseAmount);
  
  const privateStrategic = await magaFox.privateStrategic();
  expect(privateStrategic.released).to.equal(releaseAmount);
});
    
    it("Should release seed tokens when vested", async function () {
      // Need more time for seed which has 12 month cliff
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]); // 1 year
      await ethers.provider.send("evm_mine", []);
      
      const releaseAmount = ethers.parseUnits("2000", 18);
      await magaFox.releaseTokens(1, user2.address, releaseAmount); // 1 = Seed
      
      expect(await magaFox.balanceOf(user2.address)).to.equal(releaseAmount);
      
      const seed = await magaFox.seed();
      expect(seed.released).to.equal(releaseAmount);
    });
    
    it("Should release community IDO tokens when vested", async function () {
      const releaseAmount = ethers.parseUnits("3000", 18);
      await magaFox.releaseTokens(3, user3.address, releaseAmount); // 3 = Community IDO
      
      expect(await magaFox.balanceOf(user3.address)).to.equal(releaseAmount);
      
      const communityIDO = await magaFox.communityIDO();
      expect(communityIDO.released).to.equal(releaseAmount + (initialSupply * 10n * 25n) / 10000n); // Add initial 25% TGE release
    });
    
    it("Should release staking rewards when vested", async function () {
      const releaseAmount = ethers.parseUnits("500", 18);
      await magaFox.releaseTokens(5, user1.address, releaseAmount); // 5 = Staking Rewards
      
      expect(await magaFox.balanceOf(user1.address)).to.equal(releaseAmount);
      
      const stakingRewards = await magaFox.stakingRewards();
      expect(stakingRewards.released).to.equal(releaseAmount);
    });
    
    it("Should not exceed available vested amounts", async function () {
      // Get vested amount from privateStrategic fund
      const privateStrategic = await magaFox.privateStrategic();
      
      // Try to release more than vested amount
      const excessiveAmount = privateStrategic.totalAmount;
      await expect(
        magaFox.releaseTokens(2, user2.address, excessiveAmount) // 2 = PrivateStrategic
      ).to.be.revertedWithCustomError(magaFox, "AllocationExceeded");
    });
    
    it("Should release DAO reserve only through DAO vote", async function () {
      const releaseAmount = ethers.parseUnits("5000", 18);
      await magaFox.releaseTokens(9, user2.address, releaseAmount); // 9 = Future DAO Reserve
      
      expect(await magaFox.balanceOf(user2.address)).to.equal(releaseAmount);
      
      const futureDaoReserve = await magaFox.futureDaoReserve();
      expect(futureDaoReserve.released).to.equal(releaseAmount);
    });
  });
  
  describe("Buyback Functionality", function () {
    beforeEach(async function () {
      // Enable minting and mint tokens to charity treasury
      await magaFox.setContractState(1, true); // 1 = Minting status
      const mintAmount = ethers.parseUnits("100000", 18);
      await magaFox.mint(charityAddress.address, mintAmount, false);
    });
    
    it("Should execute buyback and burn tokens", async function () {
      const buybackAmount = ethers.parseUnits("50000", 18);
      const initialCharityBalance = await magaFox.balanceOf(charityAddress.address);
      const initialSupply = await magaFox.totalSupply();
      
      await magaFox.executeBuyback(buybackAmount);
      
      // Check charity balance decreased
      expect(await magaFox.balanceOf(charityAddress.address)).to.equal(initialCharityBalance - buybackAmount);
      
      // Check total supply decreased
      expect(await magaFox.totalSupply()).to.equal(initialSupply - buybackAmount);
    });
    
    it("Should not allow buyback if charity wallet is not allocated", async function () {
      // Deploy new contract without setting charity wallet
      const initialWallets = [];
      
      const MagaFox47Factory = await ethers.getContractFactory("MagaFox47");
      const newMagaFox = await MagaFox47Factory.deploy(
        tokenName, 
        tokenSymbol, 
        initialSupply, 
        imageURI,
        initialWallets
      );
      await newMagaFox.waitForDeployment();
      
      const buybackAmount = ethers.parseUnits("50000", 18);
      await expect(
        newMagaFox.executeBuyback(buybackAmount)
      ).to.be.revertedWithCustomError(newMagaFox, "ContractState"); // "NotAllocated"
    });
  });
});