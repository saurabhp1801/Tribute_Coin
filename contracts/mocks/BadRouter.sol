// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract BadRouter {
    address public WETH = address(this);

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256,
        uint256,
        address[] calldata,
        address,
        uint256
    ) external {
        // Does not send ETH back
    }
}
