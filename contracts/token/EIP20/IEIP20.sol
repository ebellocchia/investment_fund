// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * Interface of the EIP20 standard as defined in the EIP.
 */
interface IEIP20 {
    /*
     * Events
     */

    /// Event triggered when tokens are transferred from one account to another.
    event Transfer(address indexed from, address indexed to, uint256 value);
    /// Event triggered when the allowance of a spender for an owner is set to value.
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /*
     * Public functions
     */

    /**
     * Return the amount of tokens in existence.
     * @return uint256 Total supply
     */
    function totalSupply() external view returns (uint256);

    /**
     * Return the token symbol.
     * @return string Token symbol
     */
    function symbol() external view returns (string memory);

    /**
     * Return the token name.
     * @return string Token name
     */
    function name() external view returns (string memory);

    /**
     * Return the token decimal points.
     * @return uint8 Decimal points
     */
    function decimals() external view returns (uint8);

    /**
     * Return the amount of tokens owned by the specified account.
     * @param account Account address
     * @return uint256 Account balance
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * Move the specified amount of tokens from the caller's account to the recipient.
     * @param recipient Recipient address
     * @param amount Amount to be transferred
     * @return bool True if the operation succeeded, false otherwisee
     */
    function transfer(address recipient, uint256 amount) external returns (bool);

    /**
     * Return the remaining number of tokens that the spender will be
     * allowed to spend on behalf of the owner through {transferFrom}. This is
     * zero by default.
     *
     * @param owner Owner address
     * @param spender Spender address
     * @return uint256 Remaining allowance
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * Set the specified amount as the allowance of spender over the caller's tokens.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * @param spender Spender address
     * @param amount Amount to be granted
     * @return bool True if success, false otherwise
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * Move the specified amount of tokens from the sender to the recipient using the
     * allowance mechanism. The specified amount is then deducted from the caller's
     * allowance.
     *
     * @param sender Sender address
     * @param recipient Recipient address
     * @param amount Amount to be granted
     * @return bool True if success, false otherwise
     */
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}
