// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * Help contracts guard against reentrancy attacks.
 */
abstract contract ReentrancyGuard {
    /*
     * Constants
     */

    // Constant for not entered state
    uint256 private constant _NOT_ENTERED = 1;
    // Constant for entered state
    uint256 private constant _ENTERED = 2;

    /*
     * Variables
     */

    // Status
    uint256 private status;

    /*
     * Modifiers
     */

    /**
     * Prevents a contract from calling itself, directly or indirectly.
     * If you mark a function nonReentrant, you should also
     * mark it external. Calling one nonReentrant function from
     * another is not supported. Instead, you can implement a
     * private function doing the actual work, and an external
     * wrapper marked as nonReentrant.
     */
    modifier nonReentrant() {
        // On the first call to nonReentrant, status will be _NOT_ENTERED
        require(status != _ENTERED, "ReentrancyGuard: reentrant call");

        // Any calls to nonReentrant after this point will fail
        status = _ENTERED;
        _;
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        status = _NOT_ENTERED;
    }

    /*
     * Public functions
     */

    /**
     * Initialize contract by setting _NOT_ENTERED state.
     */
    constructor () {
        status = _NOT_ENTERED;
    }
}
