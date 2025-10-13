// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPancakeRouter {
    function WETH() external pure returns (address);

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;
}

contract ProtocolFeeWallet is Ownable {
    IERC20 public token;
    IPancakeRouter public router;

    address public charityWallet;
    address public liquidityWallet;
    address public protocolWallet;

    event FeesSwapped(uint256 tokenAmount, uint256 bnbReceived);
    event FeesDistributed(
        uint256 charityBNB,
        uint256 liquidityBNB,
        uint256 protocolBNB
    );

    constructor(
        address _token,
        address _router,
        address _charityWallet,
        address _liquidityWallet,
        address _protocolWallet
    ) {
        token = IERC20(_token);
        router = IPancakeRouter(_router);
        charityWallet = _charityWallet;
        liquidityWallet = _liquidityWallet;
        protocolWallet = _protocolWallet;
    }

    /**
     * @notice Swap collected tokens to BNB and distribute
     * @param amount The token amount to swap. If 0, swaps full balance.
     */
    function swapAndDistribute(uint256 amount) external onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens to swap");

        // If owner passes 0, use the full balance
        uint256 swapAmount = (amount == 0) ? balance : amount;
        require(swapAmount <= balance, "Amount exceeds balance");

        // Approve router for the swapAmount
        token.approve(address(router), swapAmount);

        address[] memory path = new address[](2);
        path[0] = address(token);
        path[1] = router.WETH(); // WBNB

        // Swap tokens -> BNB (send to this contract)
        router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            swapAmount,
            0, // accept any amount
            path,
            address(this),
            block.timestamp
        );

        uint256 bnbBalance = address(this).balance;
        require(bnbBalance > 0, "No BNB received");

        // Split: Charity 0.25%, Liquidity 0.25%, Protocol 0.20% (total 0.7%)
        // ✅ Split into 20% : 25% : 25% of the fee (0.7%)
        uint256 charityShare = (bnbBalance * 20) / 70;
        uint256 liquidityShare = (bnbBalance * 25) / 70;
        uint256 protocolShare = (bnbBalance * 25) / 70;

        payable(charityWallet).transfer(charityShare);
        payable(liquidityWallet).transfer(liquidityShare);
        payable(protocolWallet).transfer(protocolShare);

        emit FeesSwapped(swapAmount, bnbBalance);
        emit FeesDistributed(charityShare, liquidityShare, protocolShare);
    }

    /**
     * @notice Update destination wallets
     */
    function updateWallets(
        address _charity,
        address _liquidity,
        address _protocol
    ) external onlyOwner {
        if (_charity != address(0)) charityWallet = _charity;
        if (_liquidity != address(0)) liquidityWallet = _liquidity;
        if (_protocol != address(0)) protocolWallet = _protocol;
    }

    /**
     * @notice Emergency withdraw (tokens or BNB)
     */
    function emergencyWithdraw(address to) external onlyOwner {
        require(to != address(0), "Invalid address");
        payable(to).transfer(address(this).balance);
        token.transfer(to, token.balanceOf(address(this)));
    }

    // Allow contract to receive BNB
    receive() external payable {}
}
