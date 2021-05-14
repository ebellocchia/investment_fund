// SPDX-License-Identifier: MIT

/*
 * Imports
 */
pragma solidity ^0.8.0;

/*
 * Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with GSN meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    /*
     * Internal functions
     */

    /**
     * Get the sender of the message.
     * @return address Address of message sender
     */
    function _msgSender() internal view returns (address) {
        return msg.sender;
    }

    /**
     * Get the message data.
     * @return bytes Message data
     */
    function _msgData() internal view returns (bytes memory) {
        this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
        return msg.data;
    }
}
