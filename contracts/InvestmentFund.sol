// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/*
 * Imports
 */
import "./GSN/Context.sol";
import "./token/EIP20/IEIP20.sol";
import "./token/EIP20/SafeEIP20.sol";
import "./utils/ReentrancyGuard.sol";

/**
 * Smart contract implementing an investment fund logic.
 */
contract InvestmentFund is Context, ReentrancyGuard {
    using SafeEIP20 for IEIP20;

    /*
     * Constants
     */

    // Unlimited amount
    uint256 constant UNLIMITED_AMOUNT = 2**256 - 1;
    // Multiplier decimals
    uint256 constant MULTIPLIER_DECIMALS = 1e12;
    // Minimum multiplier
    uint256 constant MIN_MULTIPLIER = 1e12;
    // Contract states
    uint8 constant STATE_INITIAL = 0;
    uint8 constant STATE_BEFORE_INVESTMENT = 1;
    uint8 constant STATE_DURING_INVESTMENT = 2;
    uint8 constant STATE_AFTER_INVESTMENT = 3;

    /*
     * Structures
     */

    /// Investor deposit structure
    struct InvestorDeposit {
        uint256 amount;     // Amount of deposit
        uint256 index;      // Investor index in array
    }

    /*
     * Variables
     */

    /// Fund manager address
    address public fundManager;
    /// Pending fund manager address
    address public pendingFundManager;
    /// Token accepted by the fund
    IEIP20 public fundToken;
    /// Current state
    uint8 public currState;
    /// Force the deposit to be multiple of the specified value
    uint256 public depositMultipleOf;
    /// Minimum investor deposit
    uint256 public minInvestorDeposit;
    /// Maximum investor deposit
    uint256 public maxInvestorDeposit;
    /// Initial amount before investing
    uint256 public totalAmountBeforeInvestment;
    /// Final amount after investing
    uint256 public totalAmountAfterInvestment;
    /// Multiplier (final amount / initial amount)
    uint256 public investmentMultiplier;
    /// Address for storing funds that were not withdrawn
    address public remainingFundsAddr;
    /// List of investors deposits
    mapping (address => InvestorDeposit) public investorDeposits;
    /// List of investors addresses
    address[] public investors;

    /*
     * Modifiers
     */

    /// Check if the caller is the fund manager
    modifier onlyFundManager() {
        require(fundManager == _msgSender(), "InvestmentFund: caller is not the fund manager");
        _;
    }

    /// Check if the state is initial
    modifier onlyInitialState() {
        require(currState == STATE_INITIAL, "InvestmentFund: operation not allowed in current state");
        _;
    }

    /// Check if the state is before investment
    modifier onlyBeforeInvestment() {
        require(currState == STATE_BEFORE_INVESTMENT, "InvestmentFund: operation not allowed in current state");
        _;
    }

    /// Check if the state is during investment
    modifier onlyDuringInvestment() {
        require(currState == STATE_DURING_INVESTMENT, "InvestmentFund: operation not allowed in current state");
        _;
    }

    /// Check if the state is after investment
    modifier onlyAfterInvestment() {
        require(currState == STATE_AFTER_INVESTMENT, "InvestmentFund: operation not allowed in current state");
        _;
    }

    /// Check if the state is before or after investment
    modifier onlyBeforeOrAfterInvestment() {
        require((currState == STATE_BEFORE_INVESTMENT) || (currState == STATE_AFTER_INVESTMENT), "InvestmentFund: operation not allowed in current state");
        _;
    }

    /*
     * Events
     */

    /// Events for funds deposited by investor
    event InvestorFundsDeposited(address indexed investor, uint256 amount);
    /// Events for funds withdrawn by investor
    event InvestorAllFundsWithdrawn(address indexed investor, uint256 amount);

    /// Events for funds deposited by fund manager during investment
    event FundManagerFundsDeposited(address indexed owner, uint256 amount);
    /// Events for funds withdrawn by fund manager during investment
    event FundManagerFundsWithdrawn(address indexed owner, uint256 amount);
    /// Events for funds returned by fund manager to a specific investor after investment
    event FundManagerFundsReturnedToInvestor(address indexed investor, uint256 amount);
    /// Events for funds returned by fund manager to all investors after investment
    event FundManagerFundsReturnedToAllInvestors();

    /// Events for setting a pending fund manager
    event FundManagerPendingSet(address indexed pendingAddress);
    /// Events for changing the fund manager
    event FundManagerChanged(address indexed oldAddress, address indexed newAddress);
    /// Events for changing the remaining funds address
    event RemainingFundsAddressChanged(address oldAddress, address newAddress);
    /// Events for changing the fund token
    event FundTokenChanged(address oldToken, address newToken);
    /// Events for changing the minimum investor deposit
    event DepositMultipleOfChanged(uint256 oldValue, uint256 newValue);
    /// Events for changing the maximum investor deposit
    event MinInvestorDepositChanged(uint256 oldAmount, uint256 newAmount);
    /// Events for changing the maximum investor deposit
    event MaxInvestorDepositChanged(uint256 oldAmount, uint256 newAmount);

    /// Events for starting investor deposit
    event InvestorsDepositStarted();
    /// Events for stopping investor deposit
    event InvestorsDepositStopped();
    /// Events for starting investor withdraw
    event InvestorsWithdrawStarted();
    /// Events for stopping investor withdraw
    event InvestorsWithdrawStopped();

    /*
     * Public functions (for all)
     */

    /**
     * Initialize the contract.
     * @param  fundToken_ Contract address of the token to be used for depositing/withdrawing funds (e.g. BUSD, BNB, ...)
     */
    constructor(address fundToken_) {
        require(fundToken_ != address(0), "InvestmentFund: token address shall not be zero");

        fundToken = IEIP20(fundToken_);
        fundManager = _msgSender();
        pendingFundManager = address(0);
        remainingFundsAddr = _msgSender();
        depositMultipleOf = 1;
        minInvestorDeposit = 1;
        maxInvestorDeposit = UNLIMITED_AMOUNT;

        _resetState();
    }

    /**
     * Get the total number of investors.
     * @return investor_num Total number of investors
     */
    function numberOfInvestors() external view returns (uint256 investor_num) {
        investor_num = investors.length;
    }

    /**
     * Get the total amount of deposited funds.
     * @return total_deposit Total amount deposited funds
     */
    function totalDepositedFunds() public view returns (uint256 total_deposit) {
        total_deposit = fundToken.balanceOf(address(this));
    }

    /**
     * Called by investor to deposit the specified amount before investment is started.
     * @param amount Amount to deposit
     */
    function investorDeposit(uint256 amount) public onlyBeforeInvestment nonReentrant {
        require(amount != 0, "InvestmentFund: amount shall not be zero");
        require(amount >= minInvestorDeposit, "InvestmentFund: amount shall be higher than minimum deposit");
        require(amount <= maxInvestorDeposit, "InvestmentFund: amount shall be lower than maximum deposit");
        require((amount % depositMultipleOf) == 0, "InvestmentFund: amount shall be multiple of depositMultipleOf");

        // Get investor deposit
        InvestorDeposit storage investor_deposit = investorDeposits[_msgSender()];

        // Update it
        if (investor_deposit.amount == 0) {
            investors.push(_msgSender());
            investor_deposit.index = investors.length - 1;
        }
        investor_deposit.amount += amount;

        // Transfer tokens
        fundToken.safeTransferFrom(_msgSender(), address(this), amount);

        emit InvestorFundsDeposited(_msgSender(), amount);
    }

    /**
     * Called by investor to withdraw all the funds before of after the investment.
     */
    function investorWithdrawAll() public onlyBeforeOrAfterInvestment nonReentrant {
        // Get investor deposit
        InvestorDeposit storage investor_deposit = investorDeposits[_msgSender()];

        // Check amount
        require(investor_deposit.amount != 0, "InvestmentFund: no funds to withdraw");

        // Compute amount
        uint256 withdraw_amount = _computeAmountToWithdraw(investor_deposit.amount);

        // Update it
        investor_deposit.amount = 0;
        // Delete investor
        _deleteInvestor(investor_deposit.index);

        // Transfer token
        fundToken.safeTransfer(_msgSender(), withdraw_amount);

        emit InvestorAllFundsWithdrawn(_msgSender(), withdraw_amount);
    }

    /*
     * Public functions (only owner)
     */

    /**
     * Called by the owner to set a pending fund manager.
     * @param newFundManager Fund manager address
     */
    function setPendingFundManager(address newFundManager) public onlyFundManager onlyInitialState {
        require(newFundManager != address(0), "InvestmentFund: address shall not be zero");
        require(newFundManager != fundManager, "InvestmentFund: fund manager shall be different from the current one");

        pendingFundManager = newFundManager;

        emit FundManagerPendingSet(newFundManager);
    }

    /**
     * Called by the pending fund manager to accept the role.
     */
    function acceptFundManager() public onlyInitialState {
        require(_msgSender() == pendingFundManager, "InvestmentFund: address shall be the pending fund manager");

        address old_fund_manager = fundManager;

        fundManager = pendingFundManager;
        remainingFundsAddr = pendingFundManager;
        pendingFundManager = address(0);

        emit FundManagerChanged(old_fund_manager, _msgSender());
    }

    /*
     * Public functions (only fund manager)
     */

    /**
     * Called by the fund manager to deposit funds during investment.
     * @param amount Amount to deposit
     */
    function fundManagerDeposit(uint256 amount) public onlyFundManager onlyDuringInvestment {
        require(amount != 0, "InvestmentFund: amount shall not be zero");

        fundToken.safeTransferFrom(_msgSender(), address(this), amount);

        emit FundManagerFundsDeposited(_msgSender(), amount);
    }

    /**
     * Called by the fund manager to withdraw the specified amount of funds during investment.
     * @param amount Amount to withdraw
     */
    function fundManagerWithdraw(uint256 amount) public onlyFundManager onlyDuringInvestment {
        require(amount != 0, "InvestmentFund: amount shall not be zero");

        fundToken.safeTransfer(_msgSender(), amount);

        emit FundManagerFundsWithdrawn(_msgSender(), amount);
    }

    /**
     * Called by the fund manager to withdraw all funds during investment.
     */
    function fundManagerWithdrawAll() public onlyFundManager onlyDuringInvestment {
        fundManagerWithdraw(totalDepositedFunds());
    }

    /**
     * Called by the fund manager to return funds to a specific investor after investment.
     * Useful for forcing the withdraw of funds to a specific investor.
     * @param investor Investor address
     */
    function fundManagerReturnFundsToInvestor(address investor) public onlyFundManager onlyAfterInvestment {
        // Get investor deposit
        InvestorDeposit storage investor_deposit = investorDeposits[investor];

        // Check amount
        require(investor_deposit.amount != 0, "InvestmentFund: no funds to withdraw");

        // Compute amount
        uint256 withdraw_amount = _computeAmountToWithdraw(investor_deposit.amount);

        // Reset deposit
        investor_deposit.amount = 0;
        // Transfer token
        fundToken.safeTransfer(investor, withdraw_amount);

        // Delete investor
        _deleteInvestor(investor_deposit.index);

        emit FundManagerFundsReturnedToInvestor(investor, withdraw_amount);
    }

    /**
     * Called by the fund manager to return all funds to investors after investment.
     * Useful for forcing the withdraw of funds to all investors.
     * @dev It can be expensive in terms of gas, it's better to call it only if there are few investors remaining
     */
    function fundManagerReturnFundsToAllInvestors() public onlyFundManager onlyAfterInvestment {
        require(investors.length != 0, "InvestmentFund: no investors left");

        // Withdraw to all investors
        for (uint256 i = 0; i < investors.length; i++) {
            // Get investor deposit
            address investor_addr = investors[i];
            InvestorDeposit storage investor_deposit = investorDeposits[investor_addr];

            if (investor_deposit.amount != 0) {
                // Compute amount
                uint256 withdraw_amount = _computeAmountToWithdraw(investor_deposit.amount);
                // Reset deposit
                investor_deposit.amount = 0;
                // Transfer token
                fundToken.safeTransfer(investor_addr, withdraw_amount);
            }
        }
        // Delete all investors
        delete investors;

        emit FundManagerFundsReturnedToAllInvestors();
    }

    /**
     * Called by the fund manager to set the address to withdraw remaining funds.
     * @param remainingFundsAddr_ Address to withdraw remaining funds
     */
    function setRemainingFundsAddress(address remainingFundsAddr_) public onlyFundManager onlyInitialState {
        require(remainingFundsAddr_ != address(0), "InvestmentFund: address shall not be zero");

        address old_addr = remainingFundsAddr;
        remainingFundsAddr = remainingFundsAddr_;

        emit RemainingFundsAddressChanged(old_addr, remainingFundsAddr_);
    }

    /**
     * Called by the fund manager to set the fund token address.
     * @param fundToken_ Fund token address
     */
    function setFundToken(address fundToken_) public onlyFundManager onlyInitialState {
        require(fundToken_ != address(0), "InvestmentFund: fund token shall not be the zero address");

        address old_token = address(fundToken);
        fundToken = IEIP20(fundToken_);

        emit FundTokenChanged(old_token, fundToken_);
    }

    /**
     * Called by the fund manager to set the deposit multiple of.
     * @param value Deposit multiple of
     */
    function setDepositMultipleOf(uint256 value) public onlyFundManager onlyInitialState {
        require(value != 0, "InvestmentFund: value shall not be zero");

        uint256 old_value = depositMultipleOf;
        depositMultipleOf = value;

        emit DepositMultipleOfChanged(old_value, value);
    }

    /**
     * Called by the fund manager to set the minimum investor deposit.
     * @param amount Minimum investor deposit amount
     */
    function setMinInvestorDeposit(uint256 amount) public onlyFundManager onlyInitialState {
        require(amount != 0, "InvestmentFund: minimum amount shall not be zero");
        require(amount < maxInvestorDeposit, "InvestmentFund: minimum amount shall be lower than the maximum one");
        require((amount % depositMultipleOf) == 0, "InvestmentFund: amount shall be multiple of depositMultipleOf");

        uint256 old_value = minInvestorDeposit;
        minInvestorDeposit = amount;

        emit MinInvestorDepositChanged(old_value, amount);
    }

    /**
     * Called by the fund manager to set the maximum investor deposit.
     * @param amount Maximum investor deposit amount
     */
    function setMaxInvestorDeposit(uint256 amount) public onlyFundManager onlyInitialState {
        require(amount != 0, "InvestmentFund: maximum amount shall not be zero");
        require(amount > minInvestorDeposit, "InvestmentFund: maximum amount shall be higher than the minimum one");
        require((amount % depositMultipleOf) == 0, "InvestmentFund: amount shall be multiple of depositMultipleOf");

        uint256 old_value = maxInvestorDeposit;
        maxInvestorDeposit = amount;

        emit MaxInvestorDepositChanged(old_value, amount);
    }

    /**
     * Called by the fund manager to start investors deposit.
     */
    function startInvestorsDeposit() public onlyFundManager onlyInitialState {
        currState = STATE_BEFORE_INVESTMENT;

        emit InvestorsDepositStarted();
    }

    /**
     * Called by the fund manager to stop investors deposit.
     */
    function stopInvestorsDeposit() public onlyFundManager onlyBeforeInvestment {
        // Update state
        currState = STATE_DURING_INVESTMENT;
        // Get initial amount before investment
        totalAmountBeforeInvestment = totalDepositedFunds();

        emit InvestorsDepositStopped();
    }

    /**
     * Called by the fund manager to start investors withdraw.
     */
    function startInvestorsWithdraw() public onlyFundManager onlyDuringInvestment {
        // Update state
        currState = STATE_AFTER_INVESTMENT;
        // Get final amount after investment
        totalAmountAfterInvestment = totalDepositedFunds();
        // Compute multiplier
        investmentMultiplier = _computeMultiplier();

        emit InvestorsWithdrawStarted();
    }

    /**
     * Called by the fund manager to stop investors withdraw.
     */
    function stopInvestorsWithdraw() public onlyFundManager onlyAfterInvestment {
        // Withdraw any remaining funds
        _withdrawRemainingFunds();
        // Delete all investors
        _deleteAllInvestors();
        // Reset state
        _resetState();

        emit InvestorsWithdrawStopped();
    }

    /*
     * Internal functions
     */

     /**
      * Compute the investment multiplier.
      * @return multiplier Investment multiplier
      */
    function _computeMultiplier() internal view returns (uint256 multiplier) {
        multiplier = ((totalAmountAfterInvestment * MULTIPLIER_DECIMALS) / totalAmountBeforeInvestment);
    }

    /**
     * Compute the amount to withdraw after investment.
     * @param  initialAmount Initial amount
     * @return amount Amount to withdraw after investment
     */
    function _computeAmountToWithdraw(uint256 initialAmount) internal view returns (uint256 amount) {
        amount = ((initialAmount * investmentMultiplier) / MULTIPLIER_DECIMALS);
    }

    /**
     * Withdraw remaining funds.
     */
    function _withdrawRemainingFunds() internal {
        uint256 remaining_funds = totalDepositedFunds();

        if (remaining_funds != 0) {
            fundToken.safeTransfer(remainingFundsAddr, remaining_funds);
        }
    }

    /**
     * Delete the specified investor.
     * @param index Investor index in array
     * @dev Since order doesn't matter, the last element is copied to the element do be deleted.
     *      If investor index doesn't exist, nothing is done.
     */
    function _deleteInvestor(uint256 index) internal {
        if (index >= investors.length) return;

        address last_investor = investors[investors.length - 1];

        investors[index] = last_investor;
        investors.pop();
        // Update the index of investor that has been just moved
        investorDeposits[last_investor].index = index;
    }

    /**
     * Delete all investors deposits.
     */
    function _deleteAllInvestors() internal {
        if (investors.length != 0) {
            // Reset deposit amounts
            for (uint i = 0; i < investors.length; i++) {
                investorDeposits[investors[i]].amount = 0;
            }
            // Delete investor array
            delete investors;
        }
    }

    /**
     * Reset state.
     */
    function _resetState() internal {
        currState = STATE_INITIAL;
        totalAmountBeforeInvestment = 0;
        totalAmountAfterInvestment = 0;
        investmentMultiplier = MIN_MULTIPLIER;
    }
}
