

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
    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

library SafeERC20 {
    // function safeTransfer(IERC20 token, address to, uint256 value) internal {
    //     require(_callOptionalReturn(token, abi.encodeWithSelector(token.transfer.selector, to, value)), "SafeERC20: transfer failed");
    // }
    // function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
    //     require(_callOptionalReturn(token, abi.encodeWithSelector(token.transferFrom.selector, from, to, value)), "SafeERC20: transferFrom failed");
    // }

    error SafeTransferFailed();
    error SafeTransferFromFailed();

    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        if (
            !_callOptionalReturn(
                token,
                abi.encodeWithSelector(token.transfer.selector, to, value)
            )
        ) {
            revert SafeTransferFailed();
        }
    }

    function safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 value
    ) internal {
        if (
            !_callOptionalReturn(
                token,
                abi.encodeWithSelector(
                    token.transferFrom.selector,
                    from,
                    to,
                    value
                )
            )
        ) {
            revert SafeTransferFromFailed();
        }
    }

    function _callOptionalReturn(
        IERC20 token,
        bytes memory data
    ) private returns (bool) {
        (bool success, bytes memory returndata) = address(token).call(data);
        if (!success) return false;
        if (returndata.length == 0) return true; // non-standard ERC20
        return abi.decode(returndata, (bool));
    }
}

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status = _NOT_ENTERED;
    error Reentrancy();
    modifier nonReentrant() {
        // require(_status == _NOT_ENTERED, "REENTRANCY");
        if (_status != _NOT_ENTERED) revert Reentrancy();
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

abstract contract Ownable {
    error OwnableUnauthorizedAccount(address);
    error OwnableInvalidOwner(address);
    address private _owner;
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    constructor() {
        _transferOwnership(msg.sender);
    }

    modifier onlyOwner() {
        if (msg.sender != _owner) revert OwnableUnauthorizedAccount(msg.sender);
        _;
    }

    function owner() public view returns (address) {
        return _owner;
    }

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
    IERC20 public immutable token; // dedicated ERC20 (MAGAFox47)
    uint256 public totalLocked; // tracks (sum of schedule.total - schedule.released) across all active schedules

    // ---------- Schedule storage ----------
    struct Schedule {
        // slot 0 (32 bytes)
        address beneficiary; // 20
        uint32 start; // 4  (unix seconds)
        uint32 cliff; // 4  (seconds after start)
        uint32 duration; // 4  (total seconds)
        // slot 1 (32 bytes)
        uint128 total; // 16 (amount locked)
        uint128 released; // 16 (amount released so far)
        // slot 2 (<=32 bytes)
        uint32 slice; // 4  (granularity in seconds, e.g., 1 day)
        // uint32 revokedAt; // 4  (timestamp when revoked; 0 if active)
        // bool revocable; // 1
        // bool revoked; // 1
         uint32 revokedAt;   // 0 => active; >0 => revoked at that timestamp
         uint8  flags; 
        // remaining bytes unused in slot 2 (kept simple for clarity)
    }
    uint8 private constant _F_REVOCABLE = 1 << 0;

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
    event TokensReleased(
        bytes32 indexed id,
        address indexed beneficiary,
        address indexed to,
        uint128 amount
    );
    event ScheduleRevoked(
        bytes32 indexed id,
        address indexed beneficiary,
        uint128 vestedPaid,
        uint128 unvestedReturned
    );
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
        s.start = start;
        s.cliff = cliff;
        s.duration = duration;
        s.total = amount;
        // s.released = 0;
        s.slice = slice;
        // s.revocable = revocable;
        // s.revoked = false;
        // s.revokedAt = 0;
        s.flags       = revocable ? _F_REVOCABLE : 0;
        // revokedAt defaults to 0

        totalLocked += amount;
        _beneficiarySchedules[beneficiary].push(id);

        emit ScheduleCreated(
            id,
            beneficiary,
            amount,
            start,
            cliff,
            duration,
            slice,
            revocable
        );
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
            unchecked {
                ++i;
            }
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
            bool rv = revocables[i];

            _validateParams(b, a, st, cf, du, sl);

            bytes32 id = _newId(b, st, a);
            ids[i] = id;

            Schedule storage s = _schedules[id];
            s.beneficiary = b;
            s.start = st;
            s.cliff = cf;
            s.duration = du;
            s.total = a;
           // s.released defaults to 0
            s.slice = sl;
            // s.revocable = rv;
            // s.revoked = false;
            // s.revokedAt = 0;
             s.flags       = rv ? _F_REVOCABLE : uint8(0);
            // s.revokedAt defaults to 0
            totalLocked += a;
            _beneficiarySchedules[b].push(id);

            emit ScheduleCreated(id, b, a, st, cf, du, sl, rv);
            unchecked {
                ++i;
            }
        }
    }

    // ---------- Release & revoke ----------
    /**
     * @notice Releases currently releasable tokens to `to` (or to beneficiary if `to==0`).
     *         Callable by the beneficiary or the owner.
     */
    // function release(bytes32 id, address to) external nonReentrant {
    //     Schedule storage s = _schedules[id];
    //     if (s.beneficiary == address(0)) revert ScheduleNotFound();
    //     // if (msg.sender != s.beneficiary && msg.sender != owner())
    //      address ben = s.beneficiary;
    //    if (msg.sender != ben && msg.sender != owner()) revert NotAuthorized();

    //         revert NotAuthorized();

    //     uint128 releasable = _releasableNow(s);
    //     if (releasable == 0) revert NothingToRelease();

    //     // s.released += releasable;
    //     s.released = uint128(uint256(s.released) + releasable);
    //     totalLocked -= releasable;

    //     // address recipient = (to == address(0)) ? s.beneficiary : to;
    //      address recipient = (to == address(0)) ? ben : to;
    //     token.safeTransfer(recipient, releasable);
    //     // emit TokensReleased(id, s.beneficiary, recipient, releasable);
    //     emit TokensReleased(id, ben, recipient, releasable);
    // }

    function release(bytes32 id, address to) external nonReentrant {
    Schedule storage s = _schedules[id];
    if (s.beneficiary == address(0)) revert ScheduleNotFound();

    // 1) enforce authorization first (test expects NotAuthorized even if nothing vested)
    address ben = s.beneficiary;
    if (msg.sender != ben && msg.sender != owner()) revert NotAuthorized();

    // 2) then compute/revert if nothing to release
    uint128 releasable = _releasableNow(s);
    if (releasable == 0) revert NothingToRelease();

    // 3) commit once
    s.released = uint128(uint256(s.released) + releasable);
    totalLocked -= releasable;

    // 4) transfer & emit
    address recipient = (to == address(0)) ? ben : to;
    token.safeTransfer(recipient, releasable);
    emit TokensReleased(id, ben, recipient, releasable);
}


    /**
     * @notice Revoke a revocable schedule. Sends vested tokens (if any) to the beneficiary,
     *         and returns the unvested remainder to the owner.
     */
    function revoke(bytes32 id) external onlyOwner nonReentrant {
        Schedule storage s = _schedules[id];
        if (s.beneficiary == address(0)) revert ScheduleNotFound();
        // if (s.revoked) revert AlreadyRevoked();
        // if (!s.revocable) revert NotRevocable();
        if (s.revokedAt != 0) revert AlreadyRevoked();
        if ((s.flags & _F_REVOCABLE) == 0) revert NotRevocable();

        // Fix the revocation time
        // s.revoked = true;
        // s.revokedAt = uint32(block.timestamp);
        uint32 t = uint32(block.timestamp);
         s.revokedAt = t;

        // Compute vested/unvested at revoke time
        // uint128 vestedAtRevoke = _vestedAmountAt(s, s.revokedAt);
        // uint128 releasable = vestedAtRevoke > s.released
            // ? vestedAtRevoke - s.released
            // : 0;
        // uint128 unvested = s.total > vestedAtRevoke
            // ? s.total - vestedAtRevoke
            // : 0;
            uint128 vestedAtRevoke = _vestedAmountAt(s, t);
        uint128 releasedSoFar  = s.released;
       uint128 totalAmt       = s.total;
     uint128 releasable     = vestedAtRevoke > releasedSoFar ? vestedAtRevoke - releasedSoFar : 0;
      uint128 unvested       = totalAmt > vestedAtRevoke ? totalAmt - vestedAtRevoke : 0;

        // Pay vested to beneficiary if any
        if (releasable > 0) {
            // s.released += releasable;
             s.released = uint128(uint256(releasedSoFar) + releasable);
            totalLocked -= releasable;
            // token.safeTransfer(s.beneficiary, releasable);
            // emit TokensReleased(id, s.beneficiary, s.beneficiary, releasable);
             address ben = s.beneficiary;
             token.safeTransfer(ben, releasable);
            emit TokensReleased(id, ben, ben, releasable);
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
    error ExceedsSurplus();
    error EthNotAccepted();
    function withdrawSurplus(
        address to,
        uint256 amount
    ) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = token.balanceOf(address(this));
        uint256 surplus = bal > totalLocked ? bal - totalLocked : 0;
        // require(amount <= surplus, "Exceeds surplus");
        // if (amount > surplus) revert ExceedsSurplus();
        if (amount > surplus) revert ExceedsSurplus();
        token.safeTransfer(to, amount);
        emit SurplusWithdrawn(to, amount);
    }

    /**
     * @notice Rescue tokens accidentally sent here (but NOT the vesting token).
     */
    function recoverERC20(
        address otherToken,
        address to,
        uint256 amount
    ) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (otherToken == address(token)) revert TokenIsVestingToken();
        SafeERC20.safeTransfer(IERC20(otherToken), to, amount);
    }

    // ---------- Views ----------
    function getSchedule(
        bytes32 id
    )
        external
        view
        returns (
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
        )
    {
        Schedule storage s = _schedules[id];
        if (s.beneficiary == address(0)) revert ScheduleNotFound();
        return (
            s.beneficiary,
            s.start,
            s.cliff,
            s.duration,
            s.slice,
            // s.revocable,
            // s.revoked,
            // s.revokedAt,
            // s.total,
            // s.released
              (s.flags & _F_REVOCABLE) != 0,
              s.revokedAt != 0,
               s.revokedAt,
            s.total, s.released

        );
    }

    function schedulesOf(
        address beneficiary
    ) external view returns (bytes32[] memory) {
        return _beneficiarySchedules[beneficiary];
    }

    function vestedAmount(
        bytes32 id,
        uint256 timestamp
    ) external view returns (uint128) {
        Schedule storage s = _schedules[id];
        if (s.beneficiary == address(0)) revert ScheduleNotFound();
        uint32 ts = uint32(
            timestamp > type(uint32).max ? type(uint32).max : timestamp
        );
        // If revoked, cap at revoke time
        // if (s.revoked && ts > s.revokedAt) ts = s.revokedAt;
        if (s.revokedAt != 0 && ts > s.revokedAt) ts = s.revokedAt;
        return _vestedAmountAt(s, ts);
    }

    function releasableAmount(bytes32 id) external view returns (uint128) {
        Schedule storage s = _schedules[id];
        if (s.beneficiary == address(0)) revert ScheduleNotFound();
        return _releasableNow(s);
    }

    function releasableAmountFor(
        address beneficiary
    ) external view returns (uint256 sum) {
        bytes32[] storage arr = _beneficiarySchedules[beneficiary];
        // for (uint256 i; i < arr.length; ) {
         uint256 len = arr.length;
         for (uint256 i; i < len; ) {
            Schedule storage s = _schedules[arr[i]];
            sum += _releasableNow(s);
            unchecked {
                ++i;
            }
        }
    }

    // ---------- Internal helpers ----------
    function _newId(
        address beneficiary,
        uint32 start,
        uint128 amount
    ) private returns (bytes32 id) {
        unchecked {
            ++_nonce;
        }
        id = keccak256(
            abi.encodePacked(
                address(this),
                beneficiary,
                start,
                amount,
                _nonce,
                block.chainid
            )
        );
    }

    function _validateParams(
        address beneficiary,
        uint128 amount,
        uint32 _start,
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
        uint32 ts = uint32(
            block.timestamp > type(uint32).max
                ? type(uint32).max
                : block.timestamp
        );
        // if (s.revoked && ts > s.revokedAt) ts = s.revokedAt;
        // If revoked, cap the timestamp at revoke time
    if (s.revokedAt != 0 && ts > s.revokedAt) ts = s.revokedAt;
        uint128 vested = _vestedAmountAt(s, ts);
          uint128 rel = s.released;
    return vested > rel ? vested - rel : 0;
        // return vested > s.released ? vested - s.released : 0;
    }

    function _vestedAmountAt(
        Schedule storage s,
        uint32 ts
    ) private view returns (uint128) {
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
    // receive() external payable {
    //     revert("ETH_NOT_ACCEPTED");
    // }

    // fallback() external payable {
    //     revert("ETH_NOT_ACCEPTED");
    // }

    receive() external payable { revert EthNotAccepted(); }
    fallback() external payable { revert EthNotAccepted(); }
}
