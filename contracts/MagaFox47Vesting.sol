
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/access/AccessControl.sol";

// contract TokenVesting is AccessControl {
//     // Roles
//     bytes32 public constant VESTING_ADMIN_ROLE = keccak256("VESTING_ADMIN_ROLE");

//     // Token to be vested
//     IERC20 public immutable token;

//     struct VestingSchedule {
//         uint256 totalAmount;
//         uint256 released;
//         uint64 start;
//         uint64 cliff;
//         uint64 duration;
//     }

//     mapping(address => VestingSchedule) public beneficiaries;

//     event VestingAdded(address indexed beneficiary, uint256 totalAmount, uint64 start, uint64 cliff, uint64 duration);
//     event TokensReleased(address indexed beneficiary, uint256 amount);

//     constructor(address tokenAddress, address admin) {
//         require(tokenAddress != address(0), "Invalid token address");
//         _grantRole(DEFAULT_ADMIN_ROLE, admin);
//         _grantRole(VESTING_ADMIN_ROLE, admin);
//         token = IERC20(tokenAddress);
//     }

//     function addVestingSchedule(
//         address beneficiary,
//         uint256 totalAmount,
//         uint64 start,
//         uint64 cliffDuration,
//         uint64 duration
//     ) external onlyRole(VESTING_ADMIN_ROLE) {
//         require(beneficiary != address(0), "Invalid beneficiary");
//         require(beneficiaries[beneficiary].totalAmount == 0, "Vesting already exists");

//         uint64 cliff = start + cliffDuration;
//         beneficiaries[beneficiary] = VestingSchedule({
//             totalAmount: totalAmount,
//             released: 0,
//             start: start,
//             cliff: cliff,
//             duration: duration
//         });

//         emit VestingAdded(beneficiary, totalAmount, start, cliff, duration);
//     }

//     function release() external {
//         VestingSchedule storage vesting = beneficiaries[msg.sender];
//         require(vesting.totalAmount > 0, "No vesting for caller");

//         uint256 vested = _vestedAmount(vesting);
//         uint256 unreleased = vested - vesting.released;
//         require(unreleased > 0, "No tokens to release");

//         vesting.released += unreleased;
//         require(token.transfer(msg.sender, unreleased), "Token transfer failed");

//         emit TokensReleased(msg.sender, unreleased);
//     }

//     function _vestedAmount(VestingSchedule memory vesting) internal view returns (uint256) {
//         uint256 currentTime = block.timestamp;

//         if (currentTime < vesting.cliff) {
//             return 0;
//         } else if (currentTime >= vesting.start + vesting.duration) {
//             return vesting.totalAmount;
//         } else {
//             uint256 timeElapsed = currentTime - vesting.start;
//             return (vesting.totalAmount * timeElapsed) / vesting.duration;
//         }
//     }

//     function getReleasableAmount(address beneficiary) external view returns (uint256) {
//         VestingSchedule memory vesting = beneficiaries[beneficiary];
//         if (vesting.totalAmount == 0) return 0;
//         return _vestedAmount(vesting) - vesting.released;
//     }
// }

// ----------------------------------------------------------------------------




/**
 * @title MagaFox47Vesting (Escrow Model)
 * @notice Production-ready, security-focused token vesting escrow.
 *         - Holds ERC20 tokens (escrowed) and releases vested amounts on claim.
 *         - Supports TGE %, cliff, linear vesting, revocation of unvested amounts.
 *         - Access-controlled (DEFAULT_ADMIN_ROLE, VESTING_ADMIN_ROLE).
 *         - Pausable + NonReentrant + SafeERC20.
 *
 * SECURITY RATIONALE:
 *   - Escrow model: no mint rights; only funds explicitly sent to this contract are ever used.
 *   - ReentrancyGuard on state-changing flows (claim/revoke).
 *   - Pausable emergency stop to halt claims.
 *   - Strict math caps so released never exceeds total.
 *   - Sweep can recover non-vested-token assets only (prevents rugged “sweep” of beneficiaries’ pool).
 */

// import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
// import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
// import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
// import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// contract MagaFox47Vesting is ReentrancyGuard, AccessControl, Pausable {
//     using SafeERC20 for IERC20;

//     // --------- ROLES ---------
//     bytes32 public constant VESTING_ADMIN_ROLE = keccak256("VESTING_ADMIN_ROLE");

//     // --------- ERRORS (gas efficient) ---------
//     error InvalidParam();
//     error NotBeneficiary();
//     error NothingToClaim();
//     error Revoked();
//     error NotRevocable();
//     error ZeroAddress();
//     error NotToken();

//     // --------- STATE ---------
//     IERC20 public immutable token;       // Escrowed ERC20 token
//     address public treasury;             // Receives unvested on revoke

//     /**
//      * @dev Schedule struct is tightly packed to reduce storage gas.
//      * - Use uint128 for token amounts to pack with timestamps (fits typical 1e27+).
//      */
//     struct Schedule {
//         address beneficiary; // 20 bytes slot starts (waste but clarity > micro-opt)
//         uint128 total;       // total amount to vest
//         uint128 released;    // claimed so far
//         uint64  start;       // unix start timestamp
//         uint64  cliff;       // seconds after start
//         uint64  duration;    // linear vest duration (after cliff)
//         uint16  tgeBps;      // e.g., 2500 = 25% at TGE (at start)
//         bool    revocable;   // can admin revoke?
//         bool    revoked;     // revoked flag
//         uint64  revokeTime;  // timestamp of revoke (cap vesting at this time)
//     }

//     // Schedules are indexed by incremental id for predictability
//     uint256 public nextId;
//     mapping(uint256 => Schedule) private _schedules;
//     mapping(address => uint256[]) private _byBeneficiary; // optional UX helper

//     // --------- EVENTS ---------
//     event ScheduleCreated(
//         uint256 indexed id,
//         address indexed beneficiary,
//         uint128 total,
//         uint64 start,
//         uint64 cliff,
//         uint64 duration,
//         uint16 tgeBps,
//         bool revocable
//     );
//     event TokensClaimed(uint256 indexed id, address indexed beneficiary, uint128 amount, uint128 releasedTotal);
//     event ScheduleRevoked(uint256 indexed id, uint128 unvestedReturned);
//     event TreasuryUpdated(address indexed newTreasury);
//     event Funded(uint256 amount);

//     // --------- CONSTRUCTOR ---------
//     constructor(IERC20 _token, address _treasury, address admin) {
//         if (address(_token) == address(0) || _treasury == address(0) || admin == address(0)) revert ZeroAddress();
//         token = _token;
//         treasury = _treasury;

//         _grantRole(DEFAULT_ADMIN_ROLE, admin);
//         _grantRole(VESTING_ADMIN_ROLE, admin);
//     }

//     // --------- ADMIN: FUNDING & TREASURY ---------

//     /**
//      * @notice Fund the escrow with tokens (must pre-approve).
//      */
//     function fund(uint256 amount) external whenNotPaused {
//         token.safeTransferFrom(msg.sender, address(this), amount);
//         emit Funded(amount);
//     }

//     /**
//      * @notice Update treasury (where unvested tokens return on revoke).
//      */
//     function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
//         if (newTreasury == address(0)) revert ZeroAddress();
//         treasury = newTreasury;
//         emit TreasuryUpdated(newTreasury);
//     }

//     // --------- ADMIN: SCHEDULE CREATION ---------

//     struct Params {
//         address beneficiary;
//         uint128 total;
//         uint64  start;     // unix time when vesting begins
//         uint64  cliff;     // seconds after start (no linear vest before this)
//         uint64  duration;  // linear vest window after cliff
//         uint16  tgeBps;    // 0..10000 (TGE at 'start')
//         bool    revocable; // can be revoked?
//     }

//     /**
//      * @notice Create a single vesting schedule.
//      * @dev SECURITY: Only VESTING_ADMIN. Input validation ensures sane values.
//      */
//     function createSchedule(Params calldata p)
//         external
//         onlyRole(VESTING_ADMIN_ROLE)
//         returns (uint256 id)
//     {
//         if (p.beneficiary == address(0) || p.total == 0 || p.tgeBps > 10000) revert InvalidParam();

//         id = nextId++;
//         _schedules[id] = Schedule({
//             beneficiary: p.beneficiary,
//             total: p.total,
//             released: 0,
//             start: p.start,
//             cliff: p.cliff,
//             duration: p.duration,
//             tgeBps: p.tgeBps,
//             revocable: p.revocable,
//             revoked: false,
//             revokeTime: 0
//         });

//         _byBeneficiary[p.beneficiary].push(id);

//         emit ScheduleCreated(id, p.beneficiary, p.total, p.start, p.cliff, p.duration, p.tgeBps, p.revocable);
//     }

//     /**
//      * @notice Batch create multiple schedules (gas-bounded; chunk in caller if needed).
//      */
//     function createSchedulesBatch(Params[] calldata arr) external onlyRole(VESTING_ADMIN_ROLE) {
//         uint256 len = arr.length;
//         for (uint256 i; i < len; ) {
//             this.createSchedule(arr[i]);
//             unchecked { ++i; }
//         }
//     }

//     // --------- CLAIMING ---------

//     /**
//      * @notice Claim all currently releasable tokens for a schedule.
//      * @dev SECURITY: ReentrancyGuard & Pausable.
//      */
//     function claim(uint256 id) public nonReentrant whenNotPaused {
//         Schedule storage s = _schedules[id];
//         if (s.revoked) revert Revoked();
//         if (msg.sender != s.beneficiary) revert NotBeneficiary();

//         uint128 amount = uint128(_releasable(s, _nowCapped(s)));
//         if (amount == 0) revert NothingToClaim();

//         // effects
//         s.released += amount;
//         // interactions
//         token.safeTransfer(s.beneficiary, amount);

//         emit TokensClaimed(id, s.beneficiary, amount, s.released);
//     }

//     /**
//      * @notice Claim many schedules in one tx (gas-bounded).
//      */
//     function claimMany(uint256[] calldata ids) external {
//         uint256 len = ids.length;
//         for (uint256 i; i < len; ) {
//             claim(ids[i]);
//             unchecked { ++i; }
//         }
//     }

//     // --------- REVOCATION ---------

//     /**
//      * @notice Revoke a revocable schedule. Returns unvested to treasury.
//      *
//      * @dev SECURITY:
//      *  - Only VESTING_ADMIN.
//      *  - Already released stays with beneficiary; vesting stops at revokeTime.
//      *  - Uses nonReentrant & CEI pattern.
//      */
//     function revoke(uint256 id) external onlyRole(VESTING_ADMIN_ROLE) nonReentrant {
//         Schedule storage s = _schedules[id];
//         if (!s.revocable || s.revoked) revert NotRevocable();

//         s.revoked = true;
//         s.revokeTime = uint64(block.timestamp);

//         uint128 vestedNow = uint128(_vestedAt(s, s.revokeTime));
//         uint128 unvested = s.total > vestedNow ? (s.total - vestedNow) : 0;

//         if (unvested > 0) {
//             token.safeTransfer(treasury, unvested);
//         }

//         emit ScheduleRevoked(id, unvested);
//     }

//     // --------- VIEWS ---------

//     /**
//      * @notice Releasable amount for a schedule at the current block.
//      */
//     function releasable(uint256 id) external view returns (uint256) {
//         Schedule storage s = _schedules[id];
//         if (s.revoked) return 0;
//         return _releasable(s, _nowCapped(s));
//     }

//     /**
//      * @notice Vested amount at a specific timestamp (pure math; useful for audits/UI).
//      * @dev If revoked, vesting is capped at revokeTime.
//      */
//     function vestedAt(uint256 id, uint64 t) external view returns (uint256) {
//         Schedule storage s = _schedules[id];
//         uint64 cap = s.revoked ? s.revokeTime : t;
//         return _vestedAt(s, cap);
//     }

//     /**
//      * @notice Return a schedule (struct copy).
//      */
//     function getSchedule(uint256 id) external view returns (Schedule memory) {
//         return _schedules[id];
//     }

//     /**
//      * @notice List schedules for a beneficiary (UX helper).
//      */
//     function schedulesOf(address beneficiary) external view returns (uint256[] memory) {
//         return _byBeneficiary[beneficiary];
//     }

//     // --------- ADMIN: PAUSE ---------

//     function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
//     function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

//     // --------- SWEEP (safety) ---------

//     /**
//      * @notice Recover tokens accidentally sent here (BUT NOT the vested token).
//      */
//     function sweep(address erc20, address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
//         if (to == address(0)) revert ZeroAddress();
//         if (erc20 == address(token)) revert NotToken(); // cannot sweep the escrowed token
//         IERC20(erc20).safeTransfer(to, amount);
//     }

//     // --------- INTERNAL MATH ---------

//     function _nowCapped(Schedule storage s) internal view returns (uint64) {
//         return s.revoked ? s.revokeTime : uint64(block.timestamp);
//     }

//     /**
//      * @dev vested = TGE + linear
//      *  - TGE at 'start': tge = total * tgeBps / 10000
//      *  - Cliff: no linear vest before start+cliff
//      *  - Linear: from cliff to cliff+duration over (total - tge)
//      */
//     function _vestedAt(Schedule storage s, uint64 t) internal view returns (uint256) {
//         uint256 tge = (uint256(s.total) * s.tgeBps) / 10000;
//         uint256 linearBase = uint256(s.total) - tge;

//         if (t <= s.start) return tge; // exactly at start, TGE available
//         uint64 cliffTime = s.start + s.cliff;
//         if (t < cliffTime) return tge;

//         if (s.duration == 0) return tge; // no linear (only TGE)

//         uint64 end = cliffTime + s.duration;
//         if (t >= end) return uint256(s.total);

//         uint256 elapsed = t - cliffTime;
//         uint256 linear = (linearBase * elapsed) / s.duration;
//         return tge + linear;
//     }

//     function _releasable(Schedule storage s, uint64 t) internal view returns (uint256) {
//         uint256 v = _vestedAt(s, t);
//         return v > s.released ? v - s.released : 0;
//     }
// }




// /**
//  * MagaFox47Vesting (for MagaFox47)
//  * Step-1: Only RECORD vesting schedules. No token mint/transfer yet.
//  * Later we'll add: releasable math + claim().
//  */
// import "@openzeppelin/contracts/access/AccessControl.sol";

// contract MagaFox47Vesting is AccessControl {
//     bytes32 public constant VESTING_ADMIN_ROLE = keccak256("VESTING_ADMIN_ROLE");

//     struct Schedule {
//         address beneficiary;    // who will receive tokens later
//         uint128 total;          // total tokens to vest (18d assumed for MFX)
//         uint128 released;       // 0 for now; used later when we add claim()
//         uint64  start;          // vesting start timestamp
//         uint64  cliff;          // seconds after start before linear vest starts
//         uint64  duration;       // linear vest duration (after cliff)
//         uint16  tgeBps;         // TGE %, in basis points (e.g. 2500 = 25%)
//         bool    revocable;      // can be revoked later? (future step)
//         bool    revoked;        // has it been revoked? (future step)
//     }

//     uint256 public nextId;
//     mapping(uint256 => Schedule) public schedules;        // id => schedule
//     mapping(address => uint256[]) private _byBeneficiary; // user => schedule ids

//     event ScheduleCreated(
//         uint256 indexed id,
//         address indexed beneficiary,
//         uint128 total,
//         uint64 start,
//         uint64 cliff,
//         uint64 duration,
//         uint16 tgeBps,
//         bool revocable
//     );

//     constructor(address admin) {
//         require(admin != address(0), "admin=0");
//         _grantRole(DEFAULT_ADMIN_ROLE, admin);
//         _grantRole(VESTING_ADMIN_ROLE, admin);
//     }

//     /// @notice Create a vesting schedule (no token released now)
//     function createSchedule(
//         address beneficiary,
//         uint128 total,
//         uint64 start,
//         uint64 cliff,
//         uint64 duration,
//         uint16 tgeBps,
//         bool revocable
//     ) external onlyRole(VESTING_ADMIN_ROLE) returns (uint256 id) {
//         require(beneficiary != address(0), "beneficiary=0");
//         require(total > 0, "total=0");
//         require(tgeBps <= 10000, "tgeBps>100%");

//         id = ++nextId;

//         schedules[id] = Schedule({
//             beneficiary: beneficiary,
//             total: total,
//             released: 0,
//             start: start,
//             cliff: cliff,
//             duration: duration,
//             tgeBps: tgeBps,
//             revocable: revocable,
//             revoked: false
//         });

//         _byBeneficiary[beneficiary].push(id);
//         emit ScheduleCreated(id, beneficiary, total, start, cliff, duration, tgeBps, revocable);
//     }

//     /// view helpers
//     function getSchedule(uint256 id) external view returns (Schedule memory) {
//         return schedules[id];
//     }

//     function schedulesOf(address beneficiary) external view returns (uint256[] memory) {
//         return _byBeneficiary[beneficiary];
//     }
// }






// import "@openzeppelin/contracts/access/AccessControl.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// //second step
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/security/ReentrancyGuard.sol";


// /**
//  * @title MFxVestingStep1
//  * @dev Step-1 Vesting contract for MagaFox47: only records schedules now.
//  *      Will be extended in Step-2 to handle actual token releases
//  * @dev Records schedules and lets beneficiaries claim vested tokens.
//  *      Admin must pre-fund this contract with enough MFX to cover claims.
//  */
// contract MagaFox47Vesting is AccessControl, ReentrancyGuard {
//     //s-2
//     using SafeERC20 for IERC20;

//     bytes32 public constant VESTING_ADMIN_ROLE = keccak256("VESTING_ADMIN_ROLE");

//     struct Schedule {
//         address beneficiary;
//         uint256 totalAmount;
//         uint64 start;     // vesting start timestamp
//         uint64 cliff;     // seconds until first release
//         uint64 duration;  // total vesting duration
//         uint256 released; // amount already released
//     }

//     IERC20 public immutable magaFoxToken; // Reference to deployed MagaFox47 token
//     mapping(address => Schedule) public schedules;//// one schedule per beneficiary (simple v1)

//     event ScheduleCreated(address indexed beneficiary, uint256 totalAmount, uint64 start, uint64 cliff, uint64 duration);
//     event Claimed(address indexed beneficiary, uint256 amount, uint256 totalReleased);

//     constructor(address admin, address tokenAddress) {
//         //s-2
//          require(admin != address(0), "admin=0");
//          require(tokenAddress != address(0), "token=0");
//         _grantRole(DEFAULT_ADMIN_ROLE, admin);
//         _grantRole(VESTING_ADMIN_ROLE, admin);
//         magaFoxToken = IERC20(tokenAddress);
//     }

//   /// @notice Create a vesting schedule (no tokens sent now).
//     function createSchedule(
//         address beneficiary,
//         uint256 totalAmount,
//         uint64 start,
//         uint64 cliff,
//         uint64 duration
//     ) external onlyRole(VESTING_ADMIN_ROLE) {
//         require(beneficiary != address(0), "Invalid beneficiary");
//         require(schedules[beneficiary].beneficiary == address(0), "Schedule exists");
//         require(totalAmount > 0, "Amount must be > 0");
//         require(duration > 0, "Duration must be > 0");

//         schedules[beneficiary] = Schedule({
//             beneficiary: beneficiary,
//             totalAmount: totalAmount,
//             start: start,
//             cliff: cliff,
//             duration: duration,
//             released: 0
//         });

//         emit ScheduleCreated(beneficiary, totalAmount, start, cliff, duration);
//     }

//    //s-2
//    /// @notice How much has vested for a beneficiary up to now.
//     function vested(address beneficiary) public view returns (uint256) {
//         Schedule memory s = schedules[beneficiary];
//         if (s.beneficiary == address(0)) return 0;

//         uint256 t = block.timestamp;
//         uint256 start_ = uint256(s.start);
//         uint256 cliffTime = start_ + uint256(s.cliff);
//         uint256 end = start_ + uint256(s.duration);

//         if (t < cliffTime) return 0;
//         if (t >= end) return s.totalAmount;

//         // linear vesting from cliffTime to end
//         uint256 elapsed = t - cliffTime;
//         uint256 totalLinear = end - cliffTime; // > 0 because duration > cliff
//         return (s.totalAmount * elapsed) / totalLinear;
//     }

//     //s-2
//     /// @notice How much can be claimed now (vested - already released).
//     /// @notice Vested minus already released.
//     function releasable(address beneficiary) public view returns (uint256) {
//         Schedule memory s = schedules[beneficiary];
//         if (s.beneficiary == address(0)) return 0;
//         uint256 v = vested(beneficiary);
//         return v > s.released ? (v - s.released) : 0;
//     }


// //s-2
//  /// @notice Beneficiary claims their vested tokens.
//     function claim() external nonReentrant {
//         Schedule storage s = schedules[msg.sender];
//         require(s.beneficiary != address(0), "No schedule");

//         uint256 amount = releasable(msg.sender);
//         require(amount > 0, "Nothing to claim");

//         s.released += amount;

//         // escrow transfer: contract must have enough MFX balance
//         magaFoxToken.safeTransfer(msg.sender, amount);

//         emit Claimed(msg.sender, amount, s.released);
//     }

//     /// @notice Admin-triggered claim (optional helper for custodial flows).
//     function claimFor(address beneficiary) external onlyRole(VESTING_ADMIN_ROLE) nonReentrant {
//         Schedule storage s = schedules[beneficiary];
//         require(s.beneficiary != address(0), "No schedule");
//         uint256 amount = releasable(beneficiary);
//         require(amount > 0, "Nothing to claim");
//         s.released += amount;
//         magaFoxToken.safeTransfer(beneficiary, amount);
//         emit Claimed(beneficiary, amount, s.released);
//     }


// }




// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * MAGAFox47 Vesting
 * - Dedicated to a single ERC20 token (immutable at deployment)
 * - Linear vesting with cliff and optional slice granularity
 * - Optional revocation by owner (returns unvested to owner, sends vested remainder to beneficiary)
 * - Batch creation, nonReentrant token flows, SafeERC20, surplus accounting
 * - Gas-aware: packed storage, custom errors, minimal state writes
 *
 * NOTE: Deploy with the MAGAFox47 token address. The token cannot be changed afterward.
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address a) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from,address to,uint256 value) external returns (bool);
    event Transfer(address indexed from,address indexed to,uint256 value);
    event Approval(address indexed owner,address indexed spender,uint256 value);
}

library SafeERC20 {
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        require(_callOptionalReturn(token, abi.encodeWithSelector(token.transfer.selector, to, value)), "SafeERC20: transfer failed");
    }
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        require(_callOptionalReturn(token, abi.encodeWithSelector(token.transferFrom.selector, from, to, value)), "SafeERC20: transferFrom failed");
    }
    function _callOptionalReturn(IERC20 token, bytes memory data) private returns (bool) {
        (bool success, bytes memory returndata) = address(token).call(data);
        if (!success) return false;
        if (returndata.length == 0) return true; // non-standard ERC20
        return abi.decode(returndata, (bool));
    }
}

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED     = 2;
    uint256 private _status = _NOT_ENTERED;
    modifier nonReentrant() {
        require(_status == _NOT_ENTERED, "REENTRANCY");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

abstract contract Ownable {
    error OwnableUnauthorizedAccount(address);
    error OwnableInvalidOwner(address);
    address private _owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    constructor() {
        _transferOwnership(msg.sender);
    }
    modifier onlyOwner() {
        if (msg.sender != _owner) revert OwnableUnauthorizedAccount(msg.sender);
        _;
    }
    function owner() public view returns (address) { return _owner; }
    function transferOwnership(address newOwner) public onlyOwner {
        if (newOwner == address(0)) revert OwnableInvalidOwner(address(0));
        _transferOwnership(newOwner);
    }
    function _transferOwnership(address newOwner) internal {
        address old = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(old, newOwner);
    }
}

contract MAGAFox47Vesting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------- Errors (short, gas-friendly) ----------
    error ZeroAddress();
    error InvalidParams();
    error ScheduleNotFound();
    error NotAuthorized();
    error NothingToRelease();
    error AlreadyRevoked();
    error NotRevocable();
    error TokenIsVestingToken(); // for recoverERC20

    // ---------- Token & accounting ----------
    IERC20 public immutable token;        // dedicated ERC20 (MAGAFox47)
    uint256 public totalLocked;           // tracks (sum of schedule.total - schedule.released) across all active schedules

    // ---------- Schedule storage ----------
    struct Schedule {
        // slot 0 (32 bytes)
        address beneficiary;   // 20
        uint32 start;          // 4  (unix seconds)
        uint32 cliff;          // 4  (seconds after start)
        uint32 duration;       // 4  (total seconds)
        // slot 1 (32 bytes)
        uint128 total;         // 16 (amount locked)
        uint128 released;      // 16 (amount released so far)
        // slot 2 (<=32 bytes)
        uint32 slice;          // 4  (granularity in seconds, e.g., 1 day)
        uint32 revokedAt;      // 4  (timestamp when revoked; 0 if active)
        bool revocable;        // 1
        bool revoked;          // 1
        // remaining bytes unused in slot 2 (kept simple for clarity)
    }

    // Schedules keyed by id; beneficiaries index their schedule IDs
    mapping(bytes32 => Schedule) private _schedules;
    mapping(address => bytes32[]) private _beneficiarySchedules;

    uint128 private _nonce; // for unique id derivation

    // ---------- Events ----------
    event ScheduleCreated(
        bytes32 indexed id,
        address indexed beneficiary,
        uint128 total,
        uint32 start,
        uint32 cliff,
        uint32 duration,
        uint32 slice,
        bool revocable
    );
    event TokensReleased(bytes32 indexed id, address indexed beneficiary, address indexed to, uint128 amount);
    event ScheduleRevoked(bytes32 indexed id, address indexed beneficiary, uint128 vestedPaid, uint128 unvestedReturned);
    event SurplusWithdrawn(address indexed to, uint256 amount);
    event Funded(address indexed from, uint256 amount);

    // ---------- Constructor ----------
    constructor(address tokenAddress) {
        if (tokenAddress == address(0)) revert ZeroAddress();
        token = IERC20(tokenAddress);
    }

    // ---------- Create schedules ----------
    /**
     * @notice Create a vesting schedule and pull tokens from msg.sender.
     * @dev Requires prior token approval on this contract for `amount`.
     */
    function lock(
        address beneficiary,
        uint128 amount,
        uint32 start,
        uint32 cliff,
        uint32 duration,
        uint32 slice,
        bool revocable
    ) external onlyOwner nonReentrant returns (bytes32 id) {
        _validateParams(beneficiary, amount, start, cliff, duration, slice);

        // Pull funds first (effects after checks; still safe due to nonReentrant and dedicated token)
        token.safeTransferFrom(msg.sender, address(this), amount);

        id = _newId(beneficiary, start, amount);
        Schedule storage s = _schedules[id];

        s.beneficiary = beneficiary;
        s.start       = start;
        s.cliff       = cliff;
        s.duration    = duration;
        s.total       = amount;
        s.released    = 0;
        s.slice       = slice;
        s.revocable   = revocable;
        s.revoked     = false;
        s.revokedAt   = 0;

        totalLocked += amount;
        _beneficiarySchedules[beneficiary].push(id);

        emit ScheduleCreated(id, beneficiary, amount, start, cliff, duration, slice, revocable);
    }

    /**
     * @notice Batch create schedules (saves gas vs multiple single calls).
     * @dev Requires allowance covering the sum of all amounts.
     */
    function lockBatch(
        address[] calldata beneficiaries,
        uint128[] calldata amounts,
        uint32[] calldata starts,
        uint32[] calldata cliffs,
        uint32[] calldata durations,
        uint32[] calldata slices,
        bool[] calldata revocables
    ) external onlyOwner nonReentrant returns (bytes32[] memory ids) {
        uint256 n = beneficiaries.length;
        if (
            n == 0 ||
            n != amounts.length ||
            n != starts.length ||
            n != cliffs.length ||
            n != durations.length ||
            n != slices.length ||
            n != revocables.length
        ) revert InvalidParams();

        // Pre-pull total to reduce repeated transferFrom overhead
        uint256 sum;
        for (uint256 i; i < n; ) {
            sum += amounts[i];
            unchecked { ++i; }
        }
        if (sum == 0) revert InvalidParams();
        token.safeTransferFrom(msg.sender, address(this), sum);

        ids = new bytes32[](n);
        for (uint256 i; i < n; ) {
            address b = beneficiaries[i];
            uint128 a = amounts[i];
            uint32 st = starts[i];
            uint32 cf = cliffs[i];
            uint32 du = durations[i];
            uint32 sl = slices[i];
            bool   rv = revocables[i];

            _validateParams(b, a, st, cf, du, sl);

            bytes32 id = _newId(b, st, a);
            ids[i] = id;

            Schedule storage s = _schedules[id];
            s.beneficiary = b;
            s.start       = st;
            s.cliff       = cf;
            s.duration    = du;
            s.total       = a;
            s.released    = 0;
            s.slice       = sl;
            s.revocable   = rv;
            s.revoked     = false;
            s.revokedAt   = 0;

            totalLocked += a;
            _beneficiarySchedules[b].push(id);

            emit ScheduleCreated(id, b, a, st, cf, du, sl, rv);
            unchecked { ++i; }
        }
    }

    // ---------- Release & revoke ----------
    /**
     * @notice Releases currently releasable tokens to `to` (or to beneficiary if `to==0`).
     *         Callable by the beneficiary or the owner.
     */
    function release(bytes32 id, address to) external nonReentrant {
        Schedule storage s = _schedules[id];
        if (s.beneficiary == address(0)) revert ScheduleNotFound();
        if (msg.sender != s.beneficiary && msg.sender != owner()) revert NotAuthorized();

        uint128 releasable = _releasableNow(s);
        if (releasable == 0) revert NothingToRelease();

        s.released += releasable;
        totalLocked -= releasable;

        address recipient = (to == address(0)) ? s.beneficiary : to;
        token.safeTransfer(recipient, releasable);
        emit TokensReleased(id, s.beneficiary, recipient, releasable);
    }

    /**
     * @notice Revoke a revocable schedule. Sends vested tokens (if any) to the beneficiary,
     *         and returns the unvested remainder to the owner.
     */
    function revoke(bytes32 id) external onlyOwner nonReentrant {
        Schedule storage s = _schedules[id];
        if (s.beneficiary == address(0)) revert ScheduleNotFound();
        if (s.revoked) revert AlreadyRevoked();
        if (!s.revocable) revert NotRevocable();

        // Fix the revocation time
        s.revoked = true;
        s.revokedAt = uint32(block.timestamp);

        // Compute vested/unvested at revoke time
        uint128 vestedAtRevoke = _vestedAmountAt(s, s.revokedAt);
        uint128 releasable     = vestedAtRevoke > s.released ? vestedAtRevoke - s.released : 0;
        uint128 unvested       = s.total > vestedAtRevoke ? s.total - vestedAtRevoke : 0;

        // Pay vested to beneficiary if any
        if (releasable > 0) {
            s.released += releasable;
            totalLocked -= releasable;
            token.safeTransfer(s.beneficiary, releasable);
            emit TokensReleased(id, s.beneficiary, s.beneficiary, releasable);
        }

        // Return unvested to owner and decrease locked
        if (unvested > 0) {
            totalLocked -= unvested;
            token.safeTransfer(owner(), unvested);
        }

        emit ScheduleRevoked(id, s.beneficiary, releasable, unvested);
    }

    // ---------- Owner funding / surplus ----------
    /**
     * @notice Optional: fund the contract with extra tokens (e.g., to cover future schedules in one approval).
     */
    function fund(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert InvalidParams();
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit Funded(msg.sender, amount);
    }

    /**
     * @notice Withdraw any *surplus* MAGAFox47 tokens not reserved by active schedules.
     *         Surplus = token.balanceOf(this) - totalLocked
     */
    function withdrawSurplus(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = token.balanceOf(address(this));
        uint256 surplus = bal > totalLocked ? bal - totalLocked : 0;
        require(amount <= surplus, "Exceeds surplus");
        token.safeTransfer(to, amount);
        emit SurplusWithdrawn(to, amount);
    }

    /**
     * @notice Rescue tokens accidentally sent here (but NOT the vesting token).
     */
    function recoverERC20(address otherToken, address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (otherToken == address(token)) revert TokenIsVestingToken();
        SafeERC20.safeTransfer(IERC20(otherToken), to, amount);
    }

    // ---------- Views ----------
    function getSchedule(bytes32 id) external view returns (
        address beneficiary,
        uint32 start,
        uint32 cliff,
        uint32 duration,
        uint32 slice,
        bool revocable,
        bool revoked,
        uint32 revokedAt,
        uint128 total,
        uint128 released
    ) {
        Schedule storage s = _schedules[id];
        if (s.beneficiary == address(0)) revert ScheduleNotFound();
        return (s.beneficiary, s.start, s.cliff, s.duration, s.slice, s.revocable, s.revoked, s.revokedAt, s.total, s.released);
    }

    function schedulesOf(address beneficiary) external view returns (bytes32[] memory) {
        return _beneficiarySchedules[beneficiary];
    }

    function vestedAmount(bytes32 id, uint256 timestamp) external view returns (uint128) {
        Schedule storage s = _schedules[id];
        if (s.beneficiary == address(0)) revert ScheduleNotFound();
        uint32 ts = uint32(timestamp > type(uint32).max ? type(uint32).max : timestamp);
        // If revoked, cap at revoke time
        if (s.revoked && ts > s.revokedAt) ts = s.revokedAt;
        return _vestedAmountAt(s, ts);
    }

    function releasableAmount(bytes32 id) external view returns (uint128) {
        Schedule storage s = _schedules[id];
        if (s.beneficiary == address(0)) revert ScheduleNotFound();
        return _releasableNow(s);
    }

    function releasableAmountFor(address beneficiary) external view returns (uint256 sum) {
        bytes32[] storage arr = _beneficiarySchedules[beneficiary];
        for (uint256 i; i < arr.length; ) {
            Schedule storage s = _schedules[arr[i]];
            sum += _releasableNow(s);
            unchecked { ++i; }
        }
    }

    // ---------- Internal helpers ----------
    function _newId(address beneficiary, uint32 start, uint128 amount) private returns (bytes32 id) {
        unchecked { ++_nonce; }
        id = keccak256(abi.encodePacked(address(this), beneficiary, start, amount, _nonce, block.chainid));
    }

    function _validateParams(
        address beneficiary,
        uint128 amount,
        uint32 start,
        uint32 cliff,
        uint32 duration,
        uint32 slice
    ) private pure {
        if (beneficiary == address(0)) revert ZeroAddress();
        if (amount == 0 || duration == 0) revert InvalidParams();
        if (cliff > duration) revert InvalidParams();
        if (slice == 0 || slice > duration) revert InvalidParams();
        // optional: enforce that start is not too far in the past/future (omitted)
    }

    function _releasableNow(Schedule storage s) private view returns (uint128) {
        uint32 ts = uint32(block.timestamp > type(uint32).max ? type(uint32).max : block.timestamp);
        if (s.revoked && ts > s.revokedAt) ts = s.revokedAt;
        uint128 vested = _vestedAmountAt(s, ts);
        return vested > s.released ? vested - s.released : 0;
    }

    function _vestedAmountAt(Schedule storage s, uint32 ts) private view returns (uint128) {
        // Before cliff: 0
        if (ts < s.start + s.cliff) return 0;

        // After duration: fully vested
        if (ts >= s.start + s.duration) return s.total;

        // Linear vesting between start and end; optionally snap to slice boundary
        uint256 elapsed = ts - s.start;
        if (s.slice > 1) {
            elapsed = (elapsed / s.slice) * s.slice; // floor to slice
        }
        // vested = total * elapsed / duration
        return uint128((uint256(s.total) * elapsed) / s.duration);
    }

    // ---------- Receive / Fallback ----------
    receive() external payable { revert("ETH_NOT_ACCEPTED"); }
    fallback() external payable { revert("ETH_NOT_ACCEPTED"); }
}
