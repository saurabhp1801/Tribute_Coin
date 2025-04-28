// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Import OpenZeppelin Contracts
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// Consolidated custom errors to reduce bytecode size and ireduce gas costs
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
        CHARITY_FUND,
        TEAM_ADVISORS,
        DEVELOPMENT_FUND,
        COMMUNITY_REWARDS,
        LIQUIDITY_POOL,
        TREASURY,
        PRIVATE_SALE,
        PUBLIC_SALE
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
        bool locked;
    }

    // Core tokenomics allocations
    TokenAllocation public charityFund;     // 40%
    TokenAllocation public privateSale;     // 20%
    TokenAllocation public publicSale;      // 20%
    TokenAllocation public developmentFund; // 10%
    TokenAllocation public teamAdvisors;    // 5%
    TokenAllocation public communityRewards; // 5%

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
        for (uint256 i = 0; i < walletCount && i < 8; i++) {
            if (initialWallets[i] != address(0)) {
                allocatedWallets[WalletType(i)] = initialWallets[i];
                isWalletAllocated[WalletType(i)] = true;
                emit WalletAction(1, WalletType(i), initialWallets[i]); // 1 = allocated
            }
        }
    }

    /**
     * @dev Initialize tokenomics allocations
     */
    function _initializeTokenomics(uint256 totalSupply) private {
        uint256 now_ = block.timestamp;
        uint256 oneYear = 365 days;
        uint256 oneMonth = 30 days;
        uint256 oneQuarter = 90 days;

        // 40% for charity fund (quarterly release)
        charityFund = TokenAllocation({
            totalAmount: (totalSupply * 4) / 10,
            released: 0,
            startTime: now_,
            duration: oneQuarter * 10,
            locked: false
        });

        // 20% for private sale (1-year vesting)
        privateSale = TokenAllocation({
            totalAmount: (totalSupply * 2) / 10,
            released: 0,
            startTime: now_,
            duration: oneYear,
            locked: false
        });

        // 20% for public sale (6-month release)
        publicSale = TokenAllocation({
            totalAmount: (totalSupply * 2) / 10,
            released: 0,
            startTime: now_,
            duration: oneYear / 2,
            locked: false
        });

        // 10% for development (monthly release)
        developmentFund = TokenAllocation({
            totalAmount: totalSupply / 10,
            released: 0,
            startTime: now_,
            duration: oneMonth * 12,
            locked: false
        });
        
        // 5% for team (12-month cliff, 24-month vesting)
        teamAdvisors = TokenAllocation({
            totalAmount: (totalSupply * 5) / 100,
            released: 0,
            startTime: now_ + oneYear,
            duration: oneYear * 2,
            locked: false
        });
        
        // 5% for community rewards
        communityRewards = TokenAllocation({
            totalAmount: (totalSupply * 5) / 100,
            released: 0,
            startTime: now_,
            duration: oneYear * 2,
            locked: false
        });

        emit StatusChanged(1, true); // 1 = tokenomics initialized
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
        
        uint256 vested = _vestedAmount(charityFund);
        uint256 releasable = vested - charityFund.released;
        
        if (amount > releasable) revert AllocationExceeded();
        
        charityFund.released += amount;
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
        charityFund.locked = true;
        privateSale.locked = true;
        publicSale.locked = true;
        developmentFund.locked = true;
        teamAdvisors.locked = true;
        communityRewards.locked = true;

        emit StatusChanged(4, true); // 4 = tokenomics finalized
    }

    /**
     * @notice Calculate vested tokens for an allocation
     */
    function _vestedAmount(TokenAllocation storage allocation) private view returns (uint256) {
        if (block.timestamp < allocation.startTime) {
            return 0;
        } else if (block.timestamp >= allocation.startTime + allocation.duration) {
            return allocation.totalAmount;
        } else {
            return (allocation.totalAmount * (block.timestamp - allocation.startTime)) / allocation.duration;  //This formula is used for vesting
        }
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
        TokenAllocation storage allocation;
        string memory allocationName;
        
        if (allocationType == 1) {
            allocation = teamAdvisors;
            allocationName = "TeamAdvisors";
        } else if (allocationType == 2) {
            allocation = developmentFund;
            allocationName = "DevelopmentFund";
        } else if (allocationType == 3) {
            allocation = privateSale;
            allocationName = "PrivateSale";
        } else if (allocationType == 4) {
            allocation = publicSale;
            allocationName = "PublicSale";
        } else if (allocationType == 5) {
            allocation = communityRewards;
            allocationName = "CommunityRewards";
        } else {
            revert InvalidInput();
        }

        uint256 vested = _vestedAmount(allocation);
        uint256 releasable = vested - allocation.released;  //Rwleaseable amount is the total vested amount minus the already released amount

        if (amount > releasable) revert AllocationExceeded();

        allocation.released += amount;
        _mint(beneficiary, amount);

        emit TokenAction(1, allocationName, amount, beneficiary); // 1 = tokens released
    }


    /**
     * @notice Execute token buyback and burn 
     */
    function executeBuyback(uint256 amount) external onlyOwner nonReentrant {
        if (!isWalletAllocated[WalletType.TREASURY]) revert ContractState("NotAllocated");
        address treasury = allocatedWallets[WalletType.TREASURY];
        
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
        
        // Skip fees for contract internal transfers
        if (!transactionFeesEnabled || from == address(this) || to == address(this)) {
            super._transfer(from, to, amount);
            return;
        }
        
        // Calculate and apply fees
        uint256 feeAmount = (amount * transactionFeePercent) / 10000;
        if (feeAmount == 0) {
            super._transfer(from, to, amount);
            return;
        }
        
        // Transfer main amount
        super._transfer(from, to, amount - feeAmount);
        
        // Split fees between charity and liquidity
        uint256 charityAmount = feeAmount / 2;
        uint256 liquidityAmount = feeAmount - charityAmount;
        
        // Send to charity wallet if allocated, otherwise to recipient
        if (isWalletAllocated[WalletType.CHARITY_FUND]) {
            super._transfer(from, allocatedWallets[WalletType.CHARITY_FUND], charityAmount);
        } else {
            super._transfer(from, to, charityAmount);
            
        }
        
        // Send to liquidity wallet if allocated, otherwise to recipient
        if (isWalletAllocated[WalletType.LIQUIDITY_POOL]) {
            super._transfer(from, allocatedWallets[WalletType.LIQUIDITY_POOL], liquidityAmount);
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