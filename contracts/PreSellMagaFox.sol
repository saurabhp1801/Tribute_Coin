// import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
// import "@openzeppelin/contracts/security/Pausable.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// /// @notice Minimal interface to Vesting
// interface IMagaFox47Vesting {
//     function lock(
//         address beneficiary,
//         uint128 amount,
//         uint32 start,
//         uint32 cliff,
//         uint32 duration,
//         uint32 slice,
//         bool revocable
//     ) external returns (bytes32 id);
// }

// contract PreSellMagaFox is Ownable, Pausable, ReentrancyGuard {
//     using SafeERC20 for IERC20;

//     // ===== Errors =====
//     error ZeroAddress();
//     error InvalidParam();
//     error SaleNotActive();
//     error CapExceeded();
//     error AmountTooSmall();
//     error AmountTooLarge();
//     error NotWhitelisted();
//     error TreasuryNotSet();
//     error NothingToApprove();

//     // ===== Events =====
//     event Purchased(
//         address indexed buyer,
//         address indexed beneficiary,
//         uint256 weiSpent,
//         uint256 tokens,
//         bytes32 scheduleId
//     );

//     event PriceUpdated(uint256 newPrice);
//     event TimesUpdated(uint64 start, uint64 end);
//     event CapsUpdated(
//         uint256 hardCap,
//         uint256 minPerWallet,
//         uint256 maxPerWallet
//     );
//     event TreasuryUpdated(address treasury);
//     event WhitelistStatusChanged(bool enabled);
//     event Whitelisted(address indexed account, bool allowed);
//     event VestingTemplateUpdated(
//         uint32 startDelay,
//         uint32 cliff,
//         uint32 duration,
//         uint32 slice,
//         bool revocable
//     );
//     event VestingAllowanceApproved(uint256 allowance);
//     event EmergencyWithdraw(address token, address to, uint256 amount);
//     event NativeWithdraw(address to, uint256 amount);

//     // ===== Immutable refs =====
//     IERC20 public immutable token;
//     IMagaFox47Vesting public immutable vesting;

//     // ===== Config =====
//     uint256 public pricePerTokenWei;
//     address public treasury;
//     uint64 public startTime;
//     uint64 public endTime;

//     uint256 public hardCapWei;
//     uint256 public minPerWalletWei;
//     uint256 public maxPerWalletWei;

//     uint256 public totalRaisedWei;
//     mapping(address => uint256) private _spentWei;

//     bool public whitelistEnabled;
//     mapping(address => bool) public isWhitelisted;

//     struct VestingTemplate {
//         uint32 startDelay;
//         uint32 cliff;
//         uint32 duration;
//         uint32 slice;
//         bool revocable;
//     }
//     VestingTemplate private _vt;

//     constructor(
//         address token_,
//         address vesting_,
//         address treasury_,
//         uint256 pricePerTokenWei_,
//         uint64 start_,
//         uint64 end_,
//         uint256 hardCap_,
//         uint256 minWallet_,
//         uint256 maxWallet_,
//         VestingTemplate memory vt_
//     ) {
//         if (
//             token_ == address(0) ||
//             vesting_ == address(0) ||
//             treasury_ == address(0) ||
//             pricePerTokenWei_ == 0 ||
//             start_ >= end_
//         ) revert InvalidParam();

//         token = IERC20(token_);
//         vesting = IMagaFox47Vesting(vesting_);
//         treasury = treasury_;
//         pricePerTokenWei = pricePerTokenWei_;
//         startTime = start_;
//         endTime = end_;
//         hardCapWei = hardCap_;
//         minPerWalletWei = minWallet_;
//         maxPerWalletWei = maxWallet_;

//         _validateTemplate(vt_);
//         _vt = vt_;
//     }

//     // ===== Public buy =====
//     function PurchasedToken(
//         address beneficiary
//     ) external payable nonReentrant whenNotPaused returns (bytes32 scheduleId) {
//         if (beneficiary == address(0)) revert ZeroAddress();

//         if (!_isActive()) revert SaleNotActive();
//         if (whitelistEnabled && !isWhitelisted[msg.sender])
//             revert NotWhitelisted();

//         uint256 weiAmount = msg.value;
//         if (weiAmount == 0) revert InvalidParam();

//         uint256 newSpent = _spentWei[msg.sender] + weiAmount;
//         if (minPerWalletWei > 0 && newSpent < minPerWalletWei)
//             revert AmountTooSmall();
//         if (maxPerWalletWei > 0 && newSpent > maxPerWalletWei)
//             revert AmountTooLarge();

//         uint256 newRaised = totalRaisedWei + weiAmount;
//         if (hardCapWei > 0 && newRaised > hardCapWei) revert CapExceeded();

//         uint256 tokens18 = (weiAmount * 1e18) / pricePerTokenWei;
//         if (tokens18 == 0) revert InvalidParam();
//         if (tokens18 > type(uint128).max) revert InvalidParam();

//         _spentWei[msg.sender] = newSpent;
//         totalRaisedWei = newRaised;

//         uint32 startTs = uint32(block.timestamp + _vt.startDelay);
//         bytes32 id = vesting.lock(
//             beneficiary,
//             uint128(tokens18),
//             startTs,
//             _vt.cliff,
//             _vt.duration,
//             _vt.slice,
//             _vt.revocable
//         );

//         address t = treasury;
//         if (t == address(0)) revert TreasuryNotSet();
//         (bool ok, ) = payable(t).call{value: weiAmount}("");
//         require(ok, "Treasury transfer failed");

//         emit Purchased(msg.sender, beneficiary, weiAmount, tokens18, id);
//         return id;
//     }

//     // ===== Admin =====
//     function setPrice(uint256 newPrice) external onlyOwner {
//         if (newPrice == 0) revert InvalidParam();
//         pricePerTokenWei = newPrice;
//         emit PriceUpdated(newPrice);
//     }

//     function setTimes(uint64 s, uint64 e) external onlyOwner {
//         if (s >= e) revert InvalidParam();
//         startTime = s;
//         endTime = e;
//         emit TimesUpdated(s, e);
//     }

//     function setCaps(
//         uint256 hardCap,
//         uint256 minW,
//         uint256 maxW
//     ) external onlyOwner {
//         if (maxW > 0 && minW > maxW) revert InvalidParam();
//         hardCapWei = hardCap;
//         minPerWalletWei = minW;
//         maxPerWalletWei = maxW;
//         emit CapsUpdated(hardCap, minW, maxW);
//     }

//     function setTreasury(address newT) external onlyOwner {
//         if (newT == address(0)) revert ZeroAddress();
//         treasury = newT;
//         emit TreasuryUpdated(newT);
//     }

//     function setWhitelistEnabled(bool enabled) external onlyOwner {
//         whitelistEnabled = enabled;
//         emit WhitelistStatusChanged(enabled);
//     }

//     function setWhitelist(
//         address[] calldata accounts,
//         bool allowed
//     ) external onlyOwner {
//         for (uint256 i; i < accounts.length; ) {
//             address a = accounts[i];
//             if (a == address(0)) revert ZeroAddress();
//             isWhitelisted[a] = allowed;
//             emit Whitelisted(a, allowed);
//             unchecked {
//                 ++i;
//             }
//         }
//     }

//     function setTemplate(VestingTemplate memory vt) external onlyOwner {
//         _validateTemplate(vt);
//         _vt = vt;
//         emit VestingTemplateUpdated(
//             vt.startDelay,
//             vt.cliff,
//             vt.duration,
//             vt.slice,
//             vt.revocable
//         );
//     }

//     function approveVesting(uint256 amount) external onlyOwner {
//         if (amount == 0) revert NothingToApprove();
//         token.safeIncreaseAllowance(address(vesting), amount);
//         emit VestingAllowanceApproved(
//             token.allowance(address(this), address(vesting))
//         );
//     }

//     function pause() external onlyOwner {
//         _pause();
//     }

//     function unpause() external onlyOwner {
//         _unpause();
//     }

//     // ===== Emergency =====
//     function emergencyWithdrawToken(
//         address erc20,
//         address to,
//         uint256 amount
//     ) external onlyOwner {
//         if (to == address(0)) revert ZeroAddress();
//         IERC20(erc20).safeTransfer(to, amount);
//         emit EmergencyWithdraw(erc20, to, amount);
//     }

//     function emergencyWithdrawNative(
//         address payable to,
//         uint256 amount
//     ) external onlyOwner {
//         if (to == address(0)) revert ZeroAddress();
//         (bool ok, ) = to.call{value: amount}("");
//         require(ok, "Native withdraw failed");
//         emit NativeWithdraw(to, amount);
//     }

//     // ===== Views =====
//     function quote(uint256 weiAmount) external view returns (uint256) {
//         if (pricePerTokenWei == 0) return 0;
//         return (weiAmount * 1e18) / pricePerTokenWei;
//     }

//     function isActive() external view returns (bool) {
//         return _isActive();
//     }

//     function remainingCap() external view returns (uint256) {
//         if (hardCapWei == 0) return type(uint256).max;
//         return hardCapWei > totalRaisedWei ? (hardCapWei - totalRaisedWei) : 0;
//     }

//     function spent(address a) external view returns (uint256) {
//         return _spentWei[a];
//     }

//     function vestingTemplate() external view returns (VestingTemplate memory) {
//         return _vt;
//     }

//     // ===== Internal helpers =====
//     function _isActive() internal view returns (bool) {
//         return block.timestamp >= startTime && block.timestamp <= endTime;
//     }

//     function _validateTemplate(VestingTemplate memory vt) internal pure {
//         if (vt.duration == 0) revert InvalidParam();
//         if (vt.slice == 0 || vt.slice > vt.duration) revert InvalidParam();
//         if (vt.cliff > vt.duration) revert InvalidParam();
//     }

//     // reject accidental send
//     receive() external payable {}

//     fallback() external payable {
//         revert InvalidParam();
//     }
// }

// =====================================

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/*
  PreSellMagaFox (production-ready)
  - Sells MAGAFox47 tokens for ETH, locks purchased tokens into Vesting contract.
  - Safety: checks-effects-interactions, explicit token balance/allowance checks,
            pausable, nonReentrant, SafeERC20, custom errors.
  - Admin: whitelist, min/max per wallet, hardCap, vesting template, withdraw.
*/

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IMAGAFox47Vesting {
    function lock(
        address beneficiary,
        uint128 amount,
        uint32 start,
        uint32 cliff,
        uint32 duration,
        uint32 slice,
        bool revocable
    ) external returns (bytes32);
}

error ZeroAddress();
error InvalidParams();
error SaleNotOpen();
error CapExceeded();
error AmountTooSmall();
error AmountTooLarge();
error NotWhitelisted();
error InsufficientPresaleBalance();
error InsufficientVestingAllowance();
error TreasuryNotSet();
error NothingToApprove();

contract PreSellMagaFox is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    IMAGAFox47Vesting public immutable vesting;

    // rate = number of tokens (with 18 decimals) per 1 ETH (1e18 wei).
    // Example: rate = 1000 * 1e18  => 1 ETH buys 1000 tokens (token has 18 decimals).
    uint256 public rate;

    uint256 public saleStart;
    uint256 public saleEnd;

    uint256 public hardCap; // total tokens allowed for sale (18 decimals)
    uint256 public totalSold; // tokens sold so far (18 decimals)
    uint256 public minPerWallet; // min tokens per wallet (18 decimals)
    uint256 public maxPerWallet; // max tokens per wallet (18 decimals)

    bool public whitelistEnabled;
    mapping(address => bool) public isWhitelisted;

    mapping(address => uint256) public purchased; // tokens allocated (18 decimals)

    // Vesting template applied to each purchase (owner can set)
    struct VestingTemplate {
        uint32 startDelay; // seconds offset from now
        uint32 cliff;
        uint32 duration;
        uint32 slice;
        bool revocable;
    }
    VestingTemplate private _vt;

    // Events
    event Purchased(
        address indexed payer,
        address indexed beneficiary,
        uint256 weiAmount,
        uint256 tokenAmount,
        bytes32 scheduleId
    );
    event RateUpdated(uint256 newRate);
    event TimesUpdated(uint256 start, uint256 end);
    event CapsUpdated(
        uint256 hardCap,
        uint256 minPerWallet,
        uint256 maxPerWallet
    );
    event WhitelistEnabled(bool enabled);
    event Whitelisted(address indexed who, bool allowed);
    event VestingTemplateUpdated(
        uint32 startDelay,
        uint32 cliff,
        uint32 duration,
        uint32 slice,
        bool revocable
    );
    event FundsWithdrawn(address indexed to, uint256 amountWei);
    event RecoveredERC20(address token, address to, uint256 amount);
    event VestingAllowanceApproved(uint256 allowance);

    constructor(
        address tokenAddr,
        address vestingAddr,
        uint256 ratePerEth, // tokens-per-ETH (18-decimal-aware)
        uint256 startTs,
        uint256 endTs,
        uint256 hardCapTokens,
        uint256 minPerW,
        uint256 maxPerW,
        VestingTemplate memory vt
    ) {
        if (tokenAddr == address(0) || vestingAddr == address(0))
            revert ZeroAddress();
        if (startTs >= endTs) revert InvalidParams();
        if (ratePerEth == 0) revert InvalidParams();

        token = IERC20(tokenAddr);
        vesting = IMAGAFox47Vesting(vestingAddr);

        rate = ratePerEth;
        saleStart = startTs;
        saleEnd = endTs;

        hardCap = hardCapTokens;
        minPerWallet = minPerW;
        maxPerWallet = maxPerW;

        _validateTemplate(vt);
        _vt = vt;
    }

    // ----------------- modifiers / views -----------------

    modifier onlyOpen() {
        if (!(block.timestamp >= saleStart && block.timestamp <= saleEnd))
            revert SaleNotOpen();
        _;
    }

    function isOpen() external view returns (bool) {
        return (block.timestamp >= saleStart && block.timestamp <= saleEnd);
    }

    function remaining() external view returns (uint256) {
        return hardCap > totalSold ? (hardCap - totalSold) : 0;
    }

    function vestingTemplate() external view returns (VestingTemplate memory) {
        return _vt;
    }

    // wei -> token amount (18 decimals)
    function quoteTokens(uint256 weiAmount) public view returns (uint256) {
        // tokens = weiAmount * rate / 1e18  (but we make `rate` already 18-decimal aware)
        // If you set rate as tokens per ETH (with token decimals), then:
        // tokens = (weiAmount * rate) / 1e18  ; but to save division gas you can precompute rate as tokens per wei.
        // For clarity we assume `rate` is tokens per ETH (scaled by 1e18)
        return (weiAmount * rate) / 1e18;
    }

    // ----------------- buy flow -----------------

    function buy(
        address beneficiary
    ) external payable nonReentrant whenNotPaused onlyOpen returns (bytes32) {
        if (beneficiary == address(0)) revert ZeroAddress();
        if (msg.value == 0) revert InvalidParams();

        uint256 tokenAmount = quoteTokens(msg.value);
        if (tokenAmount == 0) revert InvalidParams();

        // per-wallet checks
        if (
            minPerWallet > 0 &&
            purchased[beneficiary] + tokenAmount < minPerWallet
        ) revert AmountTooSmall();
        if (
            maxPerWallet > 0 &&
            purchased[beneficiary] + tokenAmount > maxPerWallet
        ) revert AmountTooLarge();

        // hard cap
        if (hardCap > 0 && totalSold + tokenAmount > hardCap)
            revert CapExceeded();

        // ensure this contract has tokens
        uint256 selfBal = token.balanceOf(address(this));
        if (selfBal < tokenAmount) revert InsufficientPresaleBalance();

        // ensure vesting allowance
        uint256 allowance = token.allowance(address(this), address(vesting));
        if (allowance < tokenAmount) revert InsufficientVestingAllowance();

        // effects (accounting)
        purchased[beneficiary] += tokenAmount;
        totalSold += tokenAmount;

        // interactions: call vesting.lock (vesting will pull tokens via transferFrom)
        bytes32 scheduleId = vesting.lock(
            beneficiary,
            uint128(tokenAmount),
            uint32(block.timestamp + _vt.startDelay),
            _vt.cliff,
            _vt.duration,
            _vt.slice,
            _vt.revocable
        );

        emit Purchased(
            msg.sender,
            beneficiary,
            msg.value,
            tokenAmount,
            scheduleId
        );
        return scheduleId;
    }

    // ----------------- admin / helpers -----------------

    function setRate(uint256 newRate) external onlyOwner {
        if (newRate == 0) revert InvalidParams();
        rate = newRate;
        emit RateUpdated(newRate);
    }

    function setTimes(uint256 startTs, uint256 endTs) external onlyOwner {
        if (startTs >= endTs) revert InvalidParams();
        saleStart = startTs;
        saleEnd = endTs;
        emit TimesUpdated(startTs, endTs);
    }

    function setCaps(
        uint256 newHardCap,
        uint256 newMinPer,
        uint256 newMaxPer
    ) external onlyOwner {
        if (newHardCap == 0) revert InvalidParams();
        hardCap = newHardCap;
        minPerWallet = newMinPer;
        maxPerWallet = newMaxPer;
        emit CapsUpdated(newHardCap, newMinPer, newMaxPer);
    }

    function setWhitelistEnabled(bool enabled) external onlyOwner {
        whitelistEnabled = enabled;
        emit WhitelistEnabled(enabled);
    }

    function setWhitelist(
        address[] calldata addrs,
        bool allowed
    ) external onlyOwner {
        for (uint256 i = 0; i < addrs.length; ) {
            if (addrs[i] == address(0)) revert ZeroAddress();
            isWhitelisted[addrs[i]] = allowed;
            emit Whitelisted(addrs[i], allowed);
            unchecked {
                ++i;
            }
        }
    }

    function setVestingTemplate(
        uint32 startDelay,
        uint32 cliff,
        uint32 duration,
        uint32 slice,
        bool revocable
    ) external onlyOwner {
        VestingTemplate memory vt = VestingTemplate(
            startDelay,
            cliff,
            duration,
            slice,
            revocable
        );
        _validateTemplate(vt);
        _vt = vt;
        emit VestingTemplateUpdated(
            startDelay,
            cliff,
            duration,
            slice,
            revocable
        );
    }

    // Owner can top-up vesting allowance (recommended to set a large allowance once)
    function approveVesting(uint256 amount) external onlyOwner {
        if (amount == 0) revert NothingToApprove();
        token.safeIncreaseAllowance(address(vesting), amount);
        emit VestingAllowanceApproved(
            token.allowance(address(this), address(vesting))
        );
    }

    // Withdraw ETH collected
    function withdrawFunds(
        address payable to,
        uint256 amountWei
    ) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = address(this).balance;
        require(amountWei <= bal, "insufficient funds");
        (bool ok, ) = to.call{value: amountWei}("");
        require(ok, "withdraw failed");
        emit FundsWithdrawn(to, amountWei);
    }

    // Recover foreign ERC20 (not the sale token)
    function recoverERC20(
        address erc20,
        address to,
        uint256 amount
    ) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (erc20 == address(token)) revert InvalidParams(); // protect sale token
        IERC20(erc20).safeTransfer(to, amount);
        emit RecoveredERC20(erc20, to, amount);
    }

    // Pause/unpause
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ----------------- internal -----------------

    function _validateTemplate(VestingTemplate memory vt) internal pure {
        if (vt.duration == 0) revert InvalidParams();
        if (vt.slice == 0 || vt.slice > vt.duration) revert InvalidParams();
        if (vt.cliff > vt.duration) revert InvalidParams();
    }

    // receive fallback
    receive() external payable {}

    fallback() external payable {}
}
