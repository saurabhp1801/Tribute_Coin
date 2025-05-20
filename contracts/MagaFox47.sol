// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Import OpenZeppelin Contracts
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// Consolidated custom errors to reduce bytecode size and reduce gas costs
error Unauthorized(address account, bytes32 role);
error InvalidInput();
error ContractState(string reason);
error AllocationExceeded();
error OwnableUnauthorizedAccount();


/**
 * @title MagaFox47
 * @dev ERC20 token with charity donations, vesting schedules, and transaction fees 
 */
contract MagaFox47 is ERC20, ERC20Burnable, AccessControl, Pausable, Ownable, ReentrancyGuard {
    // Define roles using keccak256
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant CHARITY_ADMIN_ROLE = keccak256("CHARITY_ADMIN_ROLE");

    // Token metadata
    string private _tokenImageURI;

    // Contract controls
    bool public isMintingEnabled;
    bool public transactionFeesEnabled;
    uint256 public transactionFeePercent; // 100 = 1%
    mapping(address => bool) public hasAddressMinted;

    // Wallet addresses
    enum WalletType {
        CHARITY_TREASURY,
        SEED,
        PRIVATE_STRATEGIC,
        COMMUNITY_IDO,
        LIQUIDITY_AUCTION,
        STAKING_REWARDS,
        LIQUIDITY_MAKING,
        TEAM_ADVISORS,
        GROWTH_PARTNERSHIPS,
        FUTURE_DAO_RESERVE
    }
    mapping(WalletType => address) public allocatedWallets;
    mapping(WalletType => bool) public isWalletAllocated;

    // Charity management
    struct Charity {
        string name;
        bool approved;
        uint256 donated;
    }
    mapping(address => Charity) public approvedCharities;
    address[] public charityAddresses;

    // Tokenomics
    struct TokenAllocation {
        uint256 totalAmount;
        uint256 released;
        uint256 startTime;
        uint256 duration;
        uint256 cliff;
        bool locked;
    }

    // Core tokenomics allocations
    TokenAllocation public charityTreasury;    // 20%
    TokenAllocation public seed;               // 5%
    TokenAllocation public privateStrategic;   // 7%
    TokenAllocation public communityIDO;       // 10% 
    TokenAllocation public liquidityAuction;   // 5%
    TokenAllocation public stakingRewards;     // 15%
    TokenAllocation public liquidityMaking;    // 10%
    TokenAllocation public teamAdvisors;       // 10%
    TokenAllocation public growthPartnerships; // 8%
    TokenAllocation public futureDaoReserve;   // 10%

    // Events - consolidated to reduce bytecode
    event WalletAction(uint8 actionType, WalletType walletType, address wallet);
    event StatusChanged(uint8 statusType, bool status);
    event TokenAction(uint8 actionType, string allocationName, uint256 amount, address account);
    event CharityAction(uint8 actionType, address charity, string name, uint256 amount);

    /**
     * @dev Constructor initializes the token with all core settings
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        string memory tokenImageURI,
        
        address[] memory initialWallets
    ) ERC20(name, symbol) {
        // Grant roles to the deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(CHARITY_ADMIN_ROLE, msg.sender);

        // Set token image URI
        _tokenImageURI = tokenImageURI;

        // Initialize tokenomics
        _initializeTokenomics(initialSupply);

        // Default settings
        isMintingEnabled = false;
        transactionFeePercent = 100; // 1%
        transactionFeesEnabled = false;
        
        // Allocate initial wallets if provided
        uint256 walletCount = initialWallets.length;
        for (uint256 i = 0; i < walletCount && i < 10; i++) {
            if (initialWallets[i] != address(0)) {
                allocatedWallets[WalletType(i)] = initialWallets[i];
                isWalletAllocated[WalletType(i)] = true;
                emit WalletAction(1, WalletType(i), initialWallets[i]); // 1 = allocated
            }
        }
    }

    /**
     * @dev Initialize tokenomics allocations according to provided table
     */
    function _initializeTokenomics(uint256 totalSupply) private {
        uint256 now_ = block.timestamp;
        
        _initializeMainAllocations(totalSupply, now_);
        _initializeSecondaryAllocations(totalSupply, now_);

        emit StatusChanged(1, true); // 1 = tokenomics initialized
    }
    
    /**
     * @dev Initialize main tokenomics allocations
     */
    function _initializeMainAllocations(uint256 totalSupply, uint256 now_) private {
        uint256 oneMonth = 30 days;
        uint256 oneYear = 365 days;

        // 20% for charity treasury (5% unlocked each year)
        charityTreasury = TokenAllocation({
            totalAmount: (totalSupply * 20) / 100,
            released: 0,
            startTime: now_,
            duration: oneYear * 20, // 5% per year for 20 years
            cliff: 0, // No cliff
            locked: false
        });

        // 5% for seed (12m cliff → 12m linear)
        seed = TokenAllocation({
            totalAmount: (totalSupply * 5) / 100,
            released: 0,
            startTime: now_ + oneYear, // 12m cliff
            duration: oneYear, // 12m linear after cliff
            cliff: oneYear,
            locked: false
        });

        // 7% for private strategic (3m cliff → 9m linear)
        privateStrategic = TokenAllocation({
            totalAmount: (totalSupply * 7) / 100,
            released: 0,
            startTime: now_ + (oneMonth * 3), // 3m cliff
            duration: oneMonth * 9, // 9m linear after cliff
            cliff: oneMonth * 3,
            locked: false
        });

        // 10% for community IDO (25% at TGE → 3m linear)
        communityIDO = TokenAllocation({
            totalAmount: (totalSupply * 10) / 100,
            released: (totalSupply * 10 * 25) / 10000, // 25% of 10% released at TGE
            startTime: now_,
            duration: oneMonth * 3, // 3m linear for remaining
            cliff: 0, // No cliff for remaining
            locked: false
        });
        
        // 5% for liquidity auction (100% locked 12m)
        liquidityAuction = TokenAllocation({
            totalAmount: (totalSupply * 5) / 100,
            released: 0,
            startTime: now_ + oneYear, // Locked for 12m
            duration: 1 days, // All released after lock
            cliff: oneYear,
            locked: false
        });
    }
    
    /**
     * @dev Initialize secondary tokenomics allocations
     */
    function _initializeSecondaryAllocations(uint256 totalSupply, uint256 now_) private {
        uint256 oneMonth = 30 days;
        uint256 oneYear = 365 days;
        
        // 15% for staking rewards (supply-halving every 18m)
        stakingRewards = TokenAllocation({
            totalAmount: (totalSupply * 15) / 100,
            released: 0,
            startTime: now_,
            duration: oneMonth * 18 * 4, // 4 cycles of 18 months
            cliff: 0,
            locked: false
        });
        
        // 10% for liquidity & market-making (12m lock, DAO-controlled)
        liquidityMaking = TokenAllocation({
            totalAmount: (totalSupply * 10) / 100,
            released: 0,
            startTime: now_ + oneYear, // 12m lock
            duration: 1 days, // Released at DAO discretion after lock
            cliff: oneYear,
            locked: false
        });
        
        // 10% for team & advisors (12m cliff → 36m linear)
        teamAdvisors = TokenAllocation({
            totalAmount: (totalSupply * 10) / 100,
            released: 0,
            startTime: now_ + oneYear, // 12m cliff
            duration: oneMonth * 36, // 36m linear after cliff
            cliff: oneYear,
            locked: false
        });
        
        // 8% for growth/partnerships (6m cliff → 24m linear)
        growthPartnerships = TokenAllocation({
            totalAmount: (totalSupply * 8) / 100,
            released: 0,
            startTime: now_ + (oneMonth * 6), // 6m cliff
            duration: oneMonth * 24, // 24m linear after cliff
            cliff: oneMonth * 6,
            locked: false
        });
        
        // 10% for future reserve/DAO grants (No unlock without vote)
        futureDaoReserve = TokenAllocation({
            totalAmount: (totalSupply * 10) / 100,
            released: 0,
            startTime: now_,
            duration: 0, // Only unlocked by DAO vote
            cliff: 0,
            locked: false
        });
    }

    /**
     * @notice Allocate wallet addresses in batches or individually
     */
    function allocateWallets(
        WalletType[] calldata walletTypes,
        address[] calldata walletAddresses
    ) external onlyOwner {
        if (walletTypes.length != walletAddresses.length) revert InvalidInput();
        
        for (uint256 i = 0; i < walletTypes.length; i++) {
            if (walletAddresses[i] == address(0)) revert InvalidInput();
            
            allocatedWallets[walletTypes[i]] = walletAddresses[i];
            isWalletAllocated[walletTypes[i]] = true;
            
            emit WalletAction(1, walletTypes[i], walletAddresses[i]); // 1 = allocated
        }
    }

    /**
     * @notice Set contract states (minting, transaction fees)
     */
    function setContractState(uint8 stateType, bool enabled) external onlyOwner {
        if (stateType == 1) { // Minting status
            isMintingEnabled = enabled;
            emit StatusChanged(1, enabled);
        } else if (stateType == 2) { // Transaction fees
            transactionFeesEnabled = enabled;
            emit StatusChanged(2, enabled);
        } else if (stateType == 3 && enabled) { // Lock tokenomics (can only enable)
            _lockTokenomics();
        } else if (stateType == 4 && enabled) { // Pause contract
            _pause();
        } else if (stateType == 4 && !enabled) { // Unpause contract
            _unpause();
        } else {
            revert InvalidInput();
        }
    }
    
    /**
     * @notice Set transaction fee percentage (max 5%)
     */
    function setTransactionFeePercent(uint256 feePercent) external onlyOwner {
        if (feePercent > 500) revert InvalidInput(); // Max 5%
        transactionFeePercent = feePercent;
        emit StatusChanged(3, true); // 3 = fee updated
    }

    /**
     * @notice Manage charities (add or remove)
     */
    function manageCharity(
        uint8 actionType, 
        address charityAddress, 
        string memory charityName
    ) external {
        if (!hasRole(CHARITY_ADMIN_ROLE, msg.sender)) {
            revert Unauthorized(msg.sender, CHARITY_ADMIN_ROLE);
        }
        
        if (charityAddress == address(0)) revert InvalidInput();
        
        if (actionType == 1) { // Add charity
            if (!approvedCharities[charityAddress].approved) {
                charityAddresses.push(charityAddress);
            }
            
            approvedCharities[charityAddress] = Charity({
                name: charityName,
                approved: true,
                donated: approvedCharities[charityAddress].donated
            });
            
            emit CharityAction(1, charityAddress, charityName, 0); // 1 = approved
        } else if (actionType == 2) { // Remove charity
            approvedCharities[charityAddress].approved = false;
            
            // Remove from array
            for (uint256 i = 0; i < charityAddresses.length; i++) {
                if (charityAddresses[i] == charityAddress) {
                    charityAddresses[i] = charityAddresses[charityAddresses.length - 1];
                    charityAddresses.pop();
                    break;
                }
            }
            
            emit CharityAction(2, charityAddress, "", 0); // 2 = removed
        } else {
            revert InvalidInput();
        }
    }
    /**
     * @notice Donate tokens to approved charity
     */
    function donateToCharity(address charityAddress, uint256 amount) external nonReentrant {
        if (!hasRole(CHARITY_ADMIN_ROLE, msg.sender)) {
            revert Unauthorized(msg.sender, CHARITY_ADMIN_ROLE);
        }
        
        Charity storage charity = approvedCharities[charityAddress];
        if (!charity.approved) revert ContractState("NotApproved");
        
        uint256 vested = _vestedAmount(charityTreasury);
        uint256 releasable = vested - charityTreasury.released;
        
        if (amount > releasable) revert AllocationExceeded();
        
        charityTreasury.released += amount;
        charity.donated += amount;
        
        _mint(charityAddress, amount);
        
        emit CharityAction(3, charityAddress, charity.name, amount); // 3 = donation
    }

    /**
     * @notice Get charity information
     */
    function getCharityCount() external view returns (uint256) {
        return charityAddresses.length;
    }

    /**
     * @notice Lock tokenomics to prevent modifications
     */
    function _lockTokenomics() private {
        charityTreasury.locked = true;
        seed.locked = true;
        privateStrategic.locked = true;
        communityIDO.locked = true;
        liquidityAuction.locked = true;
        stakingRewards.locked = true;
        liquidityMaking.locked = true;
        teamAdvisors.locked = true;
        growthPartnerships.locked = true;
        futureDaoReserve.locked = true;

        emit StatusChanged(4, true); // 4 = tokenomics finalized
    }

    /**
     * @notice Calculate vested tokens for an allocation with cliff support
     */
    function _vestedAmount(TokenAllocation storage allocation) private view returns (uint256) {
        uint256 oneMonth = 30 days;
        
        // Special case for DAO reserve (requires governance vote)
        if (allocation.duration == 0) {
            return allocation.released; // Only what has been explicitly released
        }
        
        // Handle cliff period
        if (block.timestamp < allocation.startTime) {
            return 0;
        }
        
        // After full vesting period
        if (block.timestamp >= allocation.startTime + allocation.duration) {
            return allocation.totalAmount;
        }
        
        // For staking rewards - supply halving mechanism
        if (_isStakingRewards(allocation)) {
            return _calculateStakingVestedAmount(allocation, oneMonth);
        }
        
        // Linear vesting after cliff
        return (allocation.totalAmount * (block.timestamp - allocation.startTime)) / allocation.duration;
    }
    
    /**
     * @notice Helper to identify staking rewards allocation
     */
    function _isStakingRewards(TokenAllocation storage allocation) private view returns (bool) {
        return (allocation.totalAmount == stakingRewards.totalAmount && 
                allocation.startTime == stakingRewards.startTime && 
                allocation.duration == stakingRewards.duration);
    }
    
    /**
     * @notice Calculate vested amount for staking rewards with halving
     */
    function _calculateStakingVestedAmount(TokenAllocation storage allocation, uint256 oneMonth) private view returns (uint256) {
        uint256 elapsed = block.timestamp - allocation.startTime;
        uint256 halfCycle = (oneMonth * 18);
        uint256 cycleCount = elapsed / halfCycle;
        uint256 cycleRemainder = elapsed % halfCycle;
        
        uint256 releasedForCycles = 0;
        uint256 remaining = allocation.totalAmount;
        
        // Calculate full cycles
        for (uint256 i = 0; i < cycleCount; i++) {
            uint256 cycleRelease = remaining / 2;
            releasedForCycles += cycleRelease;
            remaining -= cycleRelease;
        }
        
        // Add partial cycle
        if (cycleRemainder > 0) {
            uint256 partialCycleRelease = (remaining / 2) * cycleRemainder / halfCycle;
            releasedForCycles += partialCycleRelease;
        }
        
        return releasedForCycles;
    }

    /**
     * @notice Release tokens from any allocation (consolidated to save bytecode)
     */
    function releaseTokens(
        uint8 allocationType,
        address beneficiary,
        uint256 amount
    ) external onlyOwner nonReentrant {
        if (beneficiary == address(0)) revert InvalidInput();

        // Get the correct allocation based on type
        TokenAllocation storage allocation = _getAllocationByType(allocationType);
        string memory allocationName = _getAllocationName(allocationType);

        // For DAO reserve, we don't check vesting since it's governed by DAO votes
        if (allocationType == 9) {
            allocation.released += amount;
            _mint(beneficiary, amount);
            emit TokenAction(1, allocationName, amount, beneficiary); // 1 = tokens released
            return;
        }

        uint256 vested = _vestedAmount(allocation);
        uint256 releasable = vested - allocation.released;

        if (amount > releasable) revert AllocationExceeded();

        allocation.released += amount;
        _mint(beneficiary, amount);

        emit TokenAction(1, allocationName, amount, beneficiary); // 1 = tokens released
    }
    
    /**
     * @notice Helper to get allocation by type ID
     */
    function _getAllocationByType(uint8 allocationType) private view returns (TokenAllocation storage) {
        if (allocationType == 1) return seed;
        if (allocationType == 2) return privateStrategic;
        if (allocationType == 3) return communityIDO;
        if (allocationType == 4) return liquidityAuction;
        if (allocationType == 5) return stakingRewards;
        if (allocationType == 6) return liquidityMaking;
        if (allocationType == 7) return teamAdvisors;
        if (allocationType == 8) return growthPartnerships;
        if (allocationType == 9) return futureDaoReserve;
        revert InvalidInput();
    }
    
    /**
     * @notice Helper to get allocation name by type ID
     */
    function _getAllocationName(uint8 allocationType) private pure returns (string memory) {
        if (allocationType == 1) return "Seed";
        if (allocationType == 2) return "PrivateStrategic";
        if (allocationType == 3) return "CommunityIDO";
        if (allocationType == 4) return "LiquidityAuction";
        if (allocationType == 5) return "StakingRewards";
        if (allocationType == 6) return "LiquidityMaking";
        if (allocationType == 7) return "TeamAdvisors";
        if (allocationType == 8) return "GrowthPartnerships";
        if (allocationType == 9) return "FutureDaoReserve";
        revert InvalidInput();
    }


    /**
     * @notice Execute token buyback and burn 
     */
    function executeBuyback(uint256 amount) external onlyOwner nonReentrant {
        if (!isWalletAllocated[WalletType.CHARITY_TREASURY]) revert ContractState("NotAllocated");
        address treasury = allocatedWallets[WalletType.CHARITY_TREASURY];
        
        // Transfer and Burn tokens to treasury
        _transfer(treasury, address(this), amount);
        _burn(address(this), amount);
        
        emit TokenAction(2, "Buyback", amount, address(0)); // 2 = buyback
    }

    /**
     * @notice Mint new tokens
     */
    function mint(
        address to, 
        uint256 amount, 
        bool enforceOneMintPerAddress
    ) public nonReentrant {
        if (paused()) revert ContractState("Paused");
        if (!isMintingEnabled) revert ContractState("MintingDisabled");
        if (!hasRole(MINTER_ROLE, msg.sender)) revert Unauthorized(msg.sender, MINTER_ROLE);
        if (enforceOneMintPerAddress && hasAddressMinted[to]) revert ContractState("AlreadyMinted");

        _mint(to, amount);
        hasAddressMinted[to] = true;
        
        emit TokenAction(3, "Mint", amount, to); // 3 = mint
    }

    /**
     * @notice Mint without one-per-address restriction
     */
    function mintWithoutRestriction(address to, uint256 amount) public {
        mint(to, amount, false);
    }

    /**
     * @notice Override transfer to implement fees
     */
function _transfer(
    address from,
    address to,
    uint256 amount
) internal virtual override {
    if (paused()) revert ContractState("Paused");

    if (!transactionFeesEnabled || from == address(this) || to == address(this)) {
        super._transfer(from, to, amount);
        return;
    }

    uint256 totalFeeAmount = (amount * 150) / 10000; // 1.5%
    uint256 totalAmount = amount + totalFeeAmount;

    // Ensure sender has enough balance for both amount and fees
    require(balanceOf(from) >= totalAmount, "ERC20: transfer amount plus fees exceeds balance");

    // Transfer full amount to recipient
    super._transfer(from, to, amount);

    // Calculate individual fees
    uint256 burnAmount = (amount * 100) / 10000;       // 1%
    uint256 charityAmount = (amount * 25) / 10000;     // 0.25%
    uint256 liquidityAmount = totalFeeAmount - burnAmount - charityAmount;

    // Burn 1%
    _burn(from, burnAmount);

    // Charity 0.25%
    if (isWalletAllocated[WalletType.CHARITY_TREASURY]) {
        super._transfer(from, allocatedWallets[WalletType.CHARITY_TREASURY], charityAmount);
    } else {
        super._transfer(from, to, charityAmount);
    }

    // Liquidity 0.25%
    if (isWalletAllocated[WalletType.LIQUIDITY_MAKING]) {
        super._transfer(from, allocatedWallets[WalletType.LIQUIDITY_MAKING], liquidityAmount);
    } else {
        super._transfer(from, to, liquidityAmount);
    }
}



    /**
     * @notice Override _burn function
     */
    function _burn(address account, uint256 amount) internal virtual override {
        if (paused()) revert ContractState("Paused");
        super._burn(account, amount);
    }

    /**
     * @notice Transfer admin role
     */
    function transferAdminRole(address newAdmin) external {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert Unauthorized(msg.sender, DEFAULT_ADMIN_ROLE);
        if (newAdmin == address(0) || newAdmin == msg.sender) revert InvalidInput();
        if (hasRole(DEFAULT_ADMIN_ROLE, newAdmin)) revert ContractState("AlreadyAdmin");

        _grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Token image URI management
     */
    function imageURI() external view returns (string memory) {
        return _tokenImageURI;
    }

    function updateImageURI(string memory newImageURI) external {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert Unauthorized(msg.sender, DEFAULT_ADMIN_ROLE);
        _tokenImageURI = newImageURI;
    }

    /**
     * @dev IERC165 implementation
     */
    function supportsInterface(bytes4 interfaceId) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}