// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/*
 * Imports
 */
import "./IEIP20.sol";
import "../../GSN/Context.sol";

/**
 * Implementation of the {IEIP20} interface.
 *
 * This implementation is agnostic to the way tokens are created. This means
 * that a supply mechanism has to be added in a derived contract using {_mint}.
 *
 * Functions revert instead of returning `false` on failure. This behavior
 * is nonetheless conventional and does not conflict with the expectations
 * of EIP20 applications.
 *
 * Additionally, an {Approval} event is emitted on calls to {transferFrom},
 * even if it isn't required by the specification.
 */
contract EIP20 is Context, IEIP20 {
    /*
     * Variables
     */

    /// Map addresses to balances
    mapping (address => uint256) private _balances;
    /// Map addresses to spender allowances
    mapping (address => mapping (address => uint256)) private _allowances;
    /// Total supply
    uint256 private _totalSupply;
    /// Token name
    string private _name;
    /// Token symbol
    string private _symbol;
    /// Token decimal points
    uint8 private _decimals;

    /*
     * Public functions
     */

    /**
     * Initialize the contract by setting token name, symbol and decimal points.
     * All three of these values are immutable: they can only be set once during
     * construction.
     *
     * @param name_ Token name
     * @param symbol_ Token symbol
     * @param decimals_ Decimnal points
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_) {
        _name = name_;
        _symbol = symbol_;
        _decimals = decimals_;
    }

    /**
     * See {IEIP20-totalSupply}.
     */
    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }

    /**
     * See {IEIP20-symbol}.
     */
    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    /**
     * See {IEIP20-name}.
     */
    function name() public view virtual override returns (string memory) {
        return _name;
    }

    /**
     * See {IEIP20-decimals}.
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * See {IEIP20-balanceOf}.
     */
    function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }

    /**
     * See {IEIP20-transfer}.
     */
    function transfer(
        address recipient,
        uint256 amount
    )
        public virtual override returns (bool)
    {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    /**
     * See {IEIP20-allowance}.
     */
    function allowance(
        address owner,
        address spender
    )
        public view virtual override returns (uint256)
    {
        return _allowances[owner][spender];
    }

    /**
     * See {IEIP20-approve}.
     */
    function approve(
        address spender,
        uint256 amount
    )
        public virtual override returns (bool)
    {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    /**
     * @dev See {IEIP20-transferFrom}.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    )
        public virtual override returns (bool)
    {
        _transfer(sender, recipient, amount);

        uint256 currentAllowance = _allowances[sender][_msgSender()];
        require(currentAllowance >= amount, "EIP20: transfer amount shall not exceed allowance");
        _approve(sender, _msgSender(), currentAllowance - amount);

        return true;
    }

    /**
     * Atomically increase the allowance granted to the spender by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IEIP20-approve}.
     *
     * @param spender Spender address
     * @param amount Amount to increase the allowance
     * @return bool Always success
     */
    function increaseAllowance(
        address spender,
        uint256 amount
    )
        public virtual returns (bool)
    {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender] + amount);
        return true;
    }

    /**
     * Atomically decrease the allowance granted to the spender by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IEIP20-approve}.
     *
     * @param spender Spender address
     * @param amount Amount to decrease the allowance
     * @return bool Always success
     */
    function decreaseAllowance(
        address spender,
        uint256 amount
    )
        public virtual returns (bool)
    {
        uint256 currentAllowance = _allowances[_msgSender()][spender];
        require(currentAllowance >= amount, "EIP20: decreased allowance shall not go below zero");
        _approve(_msgSender(), spender, currentAllowance - amount);

        return true;
    }

    /*
     * Internal functions
     */

    /**
     * Moves the specified amount of tokens from a sender to the recipient.
     *
     * This is internal function is equivalent to {transfer}, and can be used to
     * e.g. implement automatic token fees, slashing mechanisms, etc.
     *
     * @param sender Sender address
     * @param recipient Recipient address
     * @param amount Amount to be transferred
     */
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    )
        internal virtual
    {
        require(sender != address(0), "EIP20: sender shall not be the zero address");
        require(recipient != address(0), "EIP20: recipient shall not be the zero address");

        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "EIP20: transfer amount shall not exceed balance");
        _balances[sender] = senderBalance - amount;
        _balances[recipient] += amount;

        emit Transfer(sender, recipient, amount);
    }

    /**
     * Create the specified amount of tokens and assign them to the specified account,
     * increasing the total supply.
     *
     * @param account Account address
     * @param amount Amount of tokens to be minted
     */
    function _mint(
        address account,
        uint256 amount
    )
        internal virtual
    {
        require(account != address(0), "EIP20: account shall not be the zero address");

        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    /**
     * Burn the specified amount if tokens from the specified account,
     * reducing the total supply.
     *
     * @param account Account address
     * @param amount Amount of tokens to be burned
     */
    function _burn(
        address account,
        uint256 amount
    )
        internal virtual
    {
        require(account != address(0), "EIP20: account shall not be the zero address");

        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "EIP20: burn amount shall not exceed balance");
        _balances[account] = accountBalance - amount;
        _totalSupply -= amount;

        emit Transfer(account, address(0), amount);
    }

    /**
     * Set the specified amount as the allowance of spender over the owner's tokens.
     *
     * This internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * @param owner Owner address
     * @param spender Spender address
     * @param amount Amount to be changed
     */
    function _approve(
        address owner,
        address spender,
        uint256 amount
    )
        internal virtual
    {
        require(owner != address(0), "EIP20: owner shall not be the zero address");
        require(spender != address(0), "EIP20: spender shall not be the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
}
