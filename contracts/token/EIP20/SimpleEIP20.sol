// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/*
 * Imports
 */
import "./EIP20.sol";

/**
 * Extension of {EIP20} that adds an initial supply and with fixed 18 decimals.
 */
abstract contract SimpleEIP20 is EIP20 {
    /*
     * Constants
     */

    /// Decimal points
    uint8 constant DECIMAL_POINTS = 18;

    /*
     * Public functions
     */

    /**
     * Initialize the contract by minting the initial supply to the message sender
     * and setting 18 decimal points.
     *
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial supply
     */
    constructor (
        string memory name,
        string memory symbol,
        uint256 initialSupply
    )
        EIP20(name, symbol, DECIMAL_POINTS)
    {
        require(initialSupply > 0, "SimpleEIP20: initial supply shall be greater than zero");
        _mint(_msgSender(), initialSupply);
    }
}
