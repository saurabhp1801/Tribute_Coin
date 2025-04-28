import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("MagaFox47", function () {
  let magaFox;
  let owner, user1, user2, user3, charityAddress, liquidityPoolAddress, treasuryAddress;
  const tokenName = "MagaFox47";
  const tokenSymbol = "MFOX";
  let initialSupply;
  const imageURI = "https://gateway.pinata.cloud/ipfs/bafkreickhuyriahz76hvg3wxzuwbidiyg7ekx2a6cll5dl5owshtjbrrcq";
  const newImageURI = "ipfs://QmTestNew";

  // Constants for roles
  let MINTER_ROLE;
  let DEFAULT_ADMIN_ROLE;
  let CHARITY_ADMIN_ROLE;

  // Wallet types enum values
  const WalletType = {
    CHARITY_FUND: 0,
    TEAM_ADVISORS: 1,
    DEVELOPMENT_FUND: 2,
    COMMUNITY_REWARDS: 3,
    LIQUIDITY_POOL: 4,
    TREASURY: 5,
    PRIVATE_SALE: 6,
    PUBLIC_SALE: 7
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
    [owner, user1, user2, user3, charityAddress, liquidityPoolAddress, treasuryAddress] = await ethers.getSigners();
    
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
      [WalletType.CHARITY_FUND, WalletType.LIQUIDITY_POOL, WalletType.TREASURY],
      [charityAddress.address, liquidityPoolAddress.address, treasuryAddress.address]
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
      expect(await magaFox.allocatedWallets(WalletType.CHARITY_FUND)).to.equal(charityAddress.address);
      expect(await magaFox.allocatedWallets(WalletType.LIQUIDITY_POOL)).to.equal(liquidityPoolAddress.address);
      expect(await magaFox.allocatedWallets(WalletType.TREASURY)).to.equal(treasuryAddress.address);
      expect(await magaFox.isWalletAllocated(WalletType.CHARITY_FUND)).to.equal(true);
    });
    
    it("Should initialize tokenomics allocations correctly", async function () {
      // Charity Fund (40%)
      const charityFund = await magaFox.charityFund();
      const expectedCharityAmount = (initialSupply * 4n) / 10n;
      expect(charityFund.totalAmount).to.equal(expectedCharityAmount);
      expect(charityFund.released).to.equal(0);
      expect(charityFund.locked).to.equal(false);
      
      // Private Sale (20%)
      const privateSale = await magaFox.privateSale();
      const expectedPrivateSaleAmount = (initialSupply * 2n) / 10n;
      expect(privateSale.totalAmount).to.equal(expectedPrivateSaleAmount);
      expect(privateSale.released).to.equal(0);
      expect(privateSale.locked).to.equal(false);
      
      // Public Sale (20%)
      const publicSale = await magaFox.publicSale();
      const expectedPublicSaleAmount = (initialSupply * 2n) / 10n;
      expect(publicSale.totalAmount).to.equal(expectedPublicSaleAmount);
      expect(publicSale.released).to.equal(0);
      expect(publicSale.locked).to.equal(false);
      
      // Development Fund (10%)
      const developmentFund = await magaFox.developmentFund();
      const expectedDevFundAmount = initialSupply / 10n;
      expect(developmentFund.totalAmount).to.equal(expectedDevFundAmount);
      expect(developmentFund.released).to.equal(0);
      expect(developmentFund.locked).to.equal(false);
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
      // Pause the contract
      await magaFox.setContractState(4, true); // 4 = Pause contract
      
      const transferAmount = ethers.parseUnits("300", 18);
      await expect(
        magaFox.connect(user1).transfer(user2.address, transferAmount)
      ).to.be.revertedWithCustomError(magaFox, "ContractState"); // "Paused"
    });
    
    it("Should apply transaction fees when enabled", async function () {
      // Enable transaction fees (default is 1%)
      await magaFox.setContractState(2, true); // 2 = Transaction fees
      
      const transferAmount = ethers.parseUnits("1000", 18);
      await magaFox.mint(user1.address, transferAmount, false); // Add more tokens for fees
      
      // Calculate expected fees (1%)
      const feeAmount = transferAmount * 100n / 10000n; // 1% fee
      const charityAmount = feeAmount / 2n;
      const liquidityAmount = feeAmount - charityAmount;
      
      // Transfer with fees
      await magaFox.connect(user1).transfer(user3.address, transferAmount);
      
      // Check balances
      expect(await magaFox.balanceOf(user3.address)).to.equal(transferAmount - feeAmount);
      expect(await magaFox.balanceOf(charityAddress.address)).to.equal(charityAmount);
      expect(await magaFox.balanceOf(liquidityPoolAddress.address)).to.equal(liquidityAmount);
    });
    
    it("Should update transaction fee percentage", async function () {
      await magaFox.setContractState(2, true); // 2 = Transaction fees
      
      // Set fee to 2%
      await magaFox.setTransactionFeePercent(200);
      expect(await magaFox.transactionFeePercent()).to.equal(200);
      
      const transferAmount = ethers.parseUnits("1000", 18);
      await magaFox.mint(user1.address, transferAmount, false);
      
      // Calculate expected fees (2%)
      const feeAmount = transferAmount * 200n / 10000n; // 2% fee
      
      // Transfer with updated fees
      await magaFox.connect(user1).transfer(user3.address, transferAmount);
      
      // Check recipient balance
      expect(await magaFox.balanceOf(user3.address)).to.equal(transferAmount - feeAmount);
    });
    
    it("Should reject setting fees higher than 5%", async function () {
      await expect(
        magaFox.setTransactionFeePercent(600) // 6%
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
      
      const charityFund = await magaFox.charityFund();
      expect(charityFund.locked).to.equal(true);
      
      const privateSale = await magaFox.privateSale();
      expect(privateSale.locked).to.equal(true);
      
      const publicSale = await magaFox.publicSale();
      expect(publicSale.locked).to.equal(true);
      
      const developmentFund = await magaFox.developmentFund();
      expect(developmentFund.locked).to.equal(true);
      
      const teamAdvisors = await magaFox.teamAdvisors();
      expect(teamAdvisors.locked).to.equal(true);
      
      const communityRewards = await magaFox.communityRewards();
      expect(communityRewards.locked).to.equal(true);
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
      await magaFox.releaseTokens(1, user1.address, releaseAmount); // 1 = Team/Advisors
      
      expect(await magaFox.balanceOf(user1.address)).to.equal(releaseAmount);
      
      const teamAdvisors = await magaFox.teamAdvisors();
      expect(teamAdvisors.released).to.equal(releaseAmount);
    });
    
    it("Should release development funds when vested", async function () {
      const releaseAmount = ethers.parseUnits("5000", 18);
      await magaFox.releaseTokens(2, user2.address, releaseAmount); // 2 = Development Fund
      
      expect(await magaFox.balanceOf(user2.address)).to.equal(releaseAmount);
      
      const developmentFund = await magaFox.developmentFund();
      expect(developmentFund.released).to.equal(releaseAmount);
    });
    
    it("Should release private sale tokens when vested", async function () {
      const releaseAmount = ethers.parseUnits("2000", 18);
      await magaFox.releaseTokens(3, user2.address, releaseAmount); // 3 = Private Sale
      
      expect(await magaFox.balanceOf(user2.address)).to.equal(releaseAmount);
      
      const privateSale = await magaFox.privateSale();
      expect(privateSale.released).to.equal(releaseAmount);
    });
    
    it("Should release public sale tokens when vested", async function () {
      const releaseAmount = ethers.parseUnits("3000", 18);
      await magaFox.releaseTokens(4, user3.address, releaseAmount); // 4 = Public Sale
      
      expect(await magaFox.balanceOf(user3.address)).to.equal(releaseAmount);
      
      const publicSale = await magaFox.publicSale();
      expect(publicSale.released).to.equal(releaseAmount);
    });
    
    it("Should release community rewards when vested", async function () {
      const releaseAmount = ethers.parseUnits("500", 18);
      await magaFox.releaseTokens(5, user1.address, releaseAmount); // 5 = Community Rewards
      
      expect(await magaFox.balanceOf(user1.address)).to.equal(releaseAmount);
      
      const communityRewards = await magaFox.communityRewards();
      expect(communityRewards.released).to.equal(releaseAmount);
    });
    
    it("Should not exceed available vested amounts", async function () {
      // Get vested amount from development fund
      const developmentFund = await magaFox.developmentFund();
      
      // Try to release more than vested amount
      const excessiveAmount = developmentFund.totalAmount;
      await expect(
        magaFox.releaseTokens(2, user2.address, excessiveAmount) // 2 = Development Fund
      ).to.be.revertedWithCustomError(magaFox, "AllocationExceeded");
    });
  });
  
  describe("Buyback Functionality", function () {
    beforeEach(async function () {
      // Enable minting and mint tokens to treasury
      await magaFox.setContractState(1, true); // 1 = Minting status
      const mintAmount = ethers.parseUnits("100000", 18);
      await magaFox.mint(treasuryAddress.address, mintAmount, false);
    });
    
    it("Should execute buyback and burn tokens", async function () {
      const buybackAmount = ethers.parseUnits("50000", 18);
      const initialTreasuryBalance = await magaFox.balanceOf(treasuryAddress.address);
      const initialSupply = await magaFox.totalSupply();
      
      await magaFox.executeBuyback(buybackAmount);
      
      // Check treasury balance decreased
      expect(await magaFox.balanceOf(treasuryAddress.address)).to.equal(initialTreasuryBalance - buybackAmount);
      
      // Check total supply decreased
      expect(await magaFox.totalSupply()).to.equal(initialSupply - buybackAmount);
    });
    
    it("Should not allow buyback if treasury wallet is not allocated", async function () {
      // Deploy new contract without setting treasury wallet
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