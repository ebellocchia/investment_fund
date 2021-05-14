// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/*
 * Imports
 */
import "./IEIP20.sol";
import "../../utils/Address.sol";

/**
 * Wrappers around EIP20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 */
library SafeEIP20 {
    using Address for address;

    /*
     * Public functions
     */

    /**
     * Wrapper for {EIP20-transfer}.
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to be transferred
     */
    function safeTransfer(
        IEIP20 token,
        address to,
        uint256 amount
    ) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transfer.selector, to, amount));
    }

    /**
     * Wrapper for {EIP20-transferFrom}.
     * @param token Token address
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to be transferred
     */
    function safeTransferFrom(
        IEIP20 token,
        address from,
        address to,
        uint256 amount
    ) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transferFrom.selector, from, to, amount));
    }

    /**
     * Wrapper for {EIP20-approve}.
     * @param token Token address
     * @param spender Spender address
     * @param amount Amount to be transferred
     */
    function safeApprove(
        IEIP20 token,
        address spender,
        uint256 amount
    ) internal {
        // safeApprove should only be called when setting an initial allowance,
        // or when resetting it to zero. To increase and decrease it, use
        // safeIncreaseAllowance and safeDecreaseAllowance.

        // solhint-disable-next-line max-line-length
        require(
            (amount == 0) || (token.allowance(address(this), spender) == 0),
            "SafeEIP20: approve from non-zero to non-zero allowance"
        );
        _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, amount));
    }

    /**
     * Wrapper for {EIP20-increaseAllowance}.
     * @param token Token address
     * @param spender Spender address
     * @param amount Amount to be transferred
     */
    function safeIncreaseAllowance(
        IEIP20 token,
        address spender,
        uint256 amount
    ) internal {
        uint256 newAllowance = token.allowance(address(this), spender) + amount;
        _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, newAllowance));
    }

    /*
     * Internal functions
     */

    /**
     * Wrapper for {EIP20-decreaseAllowance}.
     * @param token Token address
     * @param spender Spender address
     * @param amount Amount to be transferred
     */
    function safeDecreaseAllowance(
        IEIP20 token,
        address spender,
        uint256 amount
    ) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        require(oldAllowance >= amount, "SafeERC20: decreased allowance below zero");
        uint256 newAllowance = oldAllowance - amount;
        _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, newAllowance));
    }

    /*
     * Private functions
     */

    /**
     * Imitate a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token Token address
     * @param data Call data (encoded using abi.encode or one of its variants)
     */
    function _callOptionalReturn(
        IEIP20 token,
        bytes memory data
    ) private {
        // We need to perform a low level call here, to bypass Solidity's return data size checking mechanism, since
        // we're implementing it ourselves. We use {Address.functionCall} to perform this call, which verifies that
        // the target address contains contract code and also asserts for success in the low-level call.

        bytes memory returndata = address(token).functionCall(data, "SafeEIP20: low-level call failed");
        if (returndata.length > 0) {
            // Return data is optional
            // solhint-disable-next-line max-line-length
            require(abi.decode(returndata, (bool)), "SafeEIP20: operation failed");
        }
    }
}
