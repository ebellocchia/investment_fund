// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/*
 * Imports
 */

import "./token/EIP20/SimpleEIP20.sol";

/**
 * Mock token for testing.
 */
contract MockToken is SimpleEIP20 {
    /**
     * Initialize the contract with the token name, symbol and initial supply.
     */
    constructor (
        string memory name,
        string memory symbol,
        uint256 initialSupply
    )
        SimpleEIP20(name, symbol, initialSupply)
    {}
}
