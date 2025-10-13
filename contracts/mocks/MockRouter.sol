// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockRouter {
    address public WETHAddr;

    event MockSwap(address fromToken, uint256 amountIn, uint256 ethOut, address to);

    constructor() {
        WETHAddr = address(0xBEEF); // dummy WETH address
    }

    function WETH() external view returns (address) {
        return WETHAddr;
    }

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256, // amountOutMin
        address[] calldata path,
        address to,
        uint256 // deadline
    ) external {
        require(amountIn > 0, "MockRouter: invalid amount");

        // Pull tokens from caller
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);

        // 🔑 Simulate conversion rate: 100 tokens = 1 ETH
        // You can tweak the divisor for your tests
        uint256 ethOut = amountIn / 100;

        require(address(this).balance >= ethOut, "MockRouter: not enough ETH in router");

        // Send ETH to recipient
        (bool success, ) = payable(to).call{value: ethOut}("");
        require(success, "MockRouter: failed to send ETH");

        emit MockSwap(path[0], amountIn, ethOut, to);
    }

    // Allow test funding
    receive() external payable {}
}
