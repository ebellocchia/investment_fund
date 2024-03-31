// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

//=============================================================//
//                           IMPORTS                           //
//=============================================================//
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IterableMapping} from "./libs/IterableMapping.sol";

/**
 * @author Emanuele Bellocchia (ebellocchia@gmail.com)
 * @title  Smart contract implementing an investment fund
 */
contract InvestmentFund is
    Context,
    ReentrancyGuard
{
    using IterableMapping for IterableMapping.Map;
    using SafeERC20 for IERC20;

    //=============================================================//
    //                          CONSTANTS                          //
    //=============================================================//

    /// Unlimited amount
    uint256 constant UNLIMITED_AMOUNT = 2**256 - 1;
    /// Multiplier decimals
    uint256 constant MULTIPLIER_DECIMALS = 1e12;
    /// Minimum multiplier
    uint256 constant MIN_MULTIPLIER = 1e12;

    //=============================================================//
    //                        ENUMERATIVES                         //
    //=============================================================//

    /// Investment states
    enum InvestmentStates {
        INITIAL,
        BEFORE_INVESTMENT,
        DURING_INVESTMENT,
        AFTER_INVESTMENT
    }

    //=============================================================//
    //                         STRUCTURES                          //
    //=============================================================//

    /// Investor deposit structure
    struct InvestorDeposit {
        uint256 amount;     // Amount of deposit
        uint256 index;      // Investor index in array
    }

    //=============================================================//
    //                            ERRORS                           //
    //=============================================================//

    /**
     * Error raised if the address is not valid
     * @param addr Address
     */
    error AddressError(
        address addr
    );

    /**
     * Error raised if the amount is not valid
     * @param amount Amount
     */
    error AmountError(
        uint256 amount
    );

    /**
     * Error raised if the fund manager is not the caller
     */
    error FundManagerCallerError();

    /**
     * Error raised if failing to change the fund manager
     */
    error FundManagerChangeError();

    /**
     * Error raised if the fund token is not valid
     */
    error FundTokenError();

    /**
     * Error raised if the investment state is not valid
     */
    error InvestmentStateError();

    /**
     * Error raised if no investor
     */
    error NoInvestorError();

    /**
     * Error raised if the value is not valid
     * @param value Value
     */
    error ValueError(
        uint256 value
    );

    //=============================================================//
    //                          MODIFIERS                          //
    //=============================================================//

    /**
     * Modifier to check if the caller is the fund manager
     */
    modifier onlyFundManager() {
        if (fundManager != _msgSender()) {
            revert FundManagerCallerError();
        }
        _;
    }

    /**
     * Modifier to check if the investment state is initial
     */
    modifier onlyInitialState() {
        if (currState != InvestmentStates.INITIAL) {
            revert InvestmentStateError();
        }
        _;
    }

    /**
     * Modifier to check if the investment state is before investment
     */
    modifier onlyBeforeInvestment() {
        if (currState != InvestmentStates.BEFORE_INVESTMENT) {
            revert InvestmentStateError();
        }
        _;
    }

    /**
     * Modifier to check if the investment state is during investment
     */
    modifier onlyDuringInvestment() {
        if (currState != InvestmentStates.DURING_INVESTMENT) {
            revert InvestmentStateError();
        }
        _;
    }

    /**
     * Modifier to check if the investment state is after investment
     */
    modifier onlyAfterInvestment() {
        if (currState != InvestmentStates.AFTER_INVESTMENT) {
            revert InvestmentStateError();
        }
        _;
    }

    /**
     * Modifier to check if the investment state is before or after investment
     */
    modifier onlyBeforeOrAfterInvestment() {
        if ((currState != InvestmentStates.BEFORE_INVESTMENT) && (currState != InvestmentStates.AFTER_INVESTMENT)) {
            revert InvestmentStateError();
        }
        _;
    }

    //=============================================================//
    //                            EVENTS                           //
    //=============================================================//

    /**
     * Event emitted when funds are deposited by investor
     * @param investor Investor addres
     * @param amount   Amount
     */
    event InvestorFundsDeposited(
        address indexed investor,
        uint256 amount
    );

    /**
     * Event emitted when funds are withdrawn by investor
     * @param investor Investor addres
     * @param amount   Amount
     */
    event InvestorAllFundsWithdrawn(
        address indexed investor,
        uint256 amount
    );

    /**
     * Event emitted when funds are deposited by fund manager during investment
     * @param fundManager Fund manager addres
     * @param amount      Amount
     */
    event FundManagerFundsDeposited(
        address indexed fundManager,
        uint256 amount
    );

    /**
     * Events emitted when funds are withdrawn by fund manager during investment
     * @param fundManager Fund manager address
     * @param amount      Amount
     */
    event FundManagerFundsWithdrawn(
        address indexed fundManager,
        uint256 amount
    );

    /**
     * Event emitted when funds are returned by fund manager to a specific investor after investment
     * @param investor Investor addres
     * @param amount   Amount
     */
    event FundManagerFundsReturnedToInvestor(
        address indexed investor,
        uint256 amount
    );

    /**
     * Event emitted when funds are returned by fund manager to all investors after investment
     */
    event FundManagerFundsReturnedToAllInvestors();

    /**
     * Event emitted when setting a pending fund manager
     * @param pendingFundManager Pending fund manager address
     */
    event FundManagerPendingSet(
        address indexed pendingFundManager
    );

    /**
     * Event emitted when changing the fund manager
     * @param oldFundManager Old fund manager address
     * @param newFundManager New fund manager address
     */
    event FundManagerChanged(
        address indexed oldFundManager,
        address indexed newFundManager
    );

    /**
     * Event emitted when changing the remaining funds address
     * @param oldAddress Old fund manager address
     * @param newAddress New fund manager address
     */
    event RemainingFundsAddressChanged(
        address oldAddress,
        address newAddress
    );

    /**
     * Event emitted when changing the fund token
     * @param oldToken Old token address
     * @param newToken New token address
     */
    event FundTokenChanged(
        address oldToken,
        address newToken
    );

    /**
     * Event emitted when changing the minimum investor deposit
     * @param oldValue Old value
     * @param newValue New value
     */
    event DepositMultipleOfChanged(
        uint256 oldValue,
        uint256 newValue
    );

    /**
     * Event emitted when changing the maximum investor deposit
     * @param oldValue Old value
     * @param newValue New value
     */
    event MinInvestorDepositChanged(
        uint256 oldValue,
        uint256 newValue
    );

    /**
     * Event emitted when changing the maximum investor deposit
     * @param oldValue Old value
     * @param newValue New value
     */
    event MaxInvestorDepositChanged(
        uint256 oldValue,
        uint256 newValue
    );

    /**
     * Event emitted when starting investor deposit
     */
    event InvestorsDepositStarted();

    /**
     * Event emitted when stopping investor deposit
     */
    event InvestorsDepositStopped();

    /**
     * Event emitted when starting investor withdraw
     */
    event InvestorsWithdrawStarted();

    /**
     * Event emitted when stopping investor withdraw
     */
    event InvestorsWithdrawStopped();

    //=============================================================//
    //                           STORAGE                           //
    //=============================================================//

    /// Fund manager address
    address public fundManager;
    /// Pending fund manager address
    address public pendingFundManager;
    /// Token accepted by the fund
    IERC20 public fundToken;
    /// Current state
    InvestmentStates public currState;
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
    /// List of investors addresses
    IterableMapping.Map private _investors;

    //=============================================================//
    //                         CONSTRUCTOR                         //
    //=============================================================//

    /**
     * Initialize the contract
     * @param fundToken_ Contract address of the token to be used for depositing/withdrawing funds (e.g. BUSD, BNB, ...)
     */
    constructor(
        address fundToken_
    ) {
        if (fundToken_ == address(0)) {
            revert FundTokenError();
        }

        fundToken = IERC20(fundToken_);
        fundManager = _msgSender();
        pendingFundManager = address(0);
        remainingFundsAddr = _msgSender();
        depositMultipleOf = 1;
        minInvestorDeposit = 1;
        maxInvestorDeposit = UNLIMITED_AMOUNT;

        __resetState();
    }

    //=============================================================//
    //                   PUBLIC FUNCTIONS (ALL)                    //
    //=============================================================//

    /**
     * Get the total number of investors
     * @return Total number of investors
     */
    function numberOfInvestors() external view returns (uint256) {
        return _investors.length();
    }

    /**
     * Get all investors addresses
     * @return Array of investor addresses
     */
    function allInvestors() external view returns (address[] memory) {
        return _investors.allKeys();
    }

    /**
     * Get the deposited amount of the specified investor
     * @param investor_ Investor address
     * @return Deposited amount
     */
    function depositOfInvestor(
        address investor_
    ) external view returns (uint256) {
        return _investors.getByKey(investor_);
    }

    /**
     * Get the total amount of deposited funds
     * @return Total amount deposited funds
     */
    function totalDepositedFunds() public view returns (uint256) {
        return fundToken.balanceOf(address(this));
    }

    /**
     * Called by investor to deposit the specified amount before investment is started
     * @param amount_ Amount to deposit
     */
    function investorDeposit(
        uint256 amount_
    ) public onlyBeforeInvestment nonReentrant {
        // Check amount
        if (
                (amount_ == 0) ||
                (amount_ < minInvestorDeposit) || (amount_ > maxInvestorDeposit) ||
                ((amount_ % depositMultipleOf) != 0)
        ) {
            revert AmountError(amount_);
        }

        address investor_addr = _msgSender();

        // Update investor
        _investors.add(investor_addr, amount_);
        // Transfer tokens
        fundToken.safeTransferFrom(investor_addr, address(this), amount_);

        emit InvestorFundsDeposited(investor_addr, amount_);
    }

    /**
     * Called by investor to withdraw all the funds before of after the investment
     */
    function investorWithdrawAll() public onlyBeforeOrAfterInvestment nonReentrant {
        address investor_addr = _msgSender();
        uint256 amount = _investors.getByKey(investor_addr);

        // Check amount
        if (amount == 0) {
            revert AmountError(amount);
        }

        // Compute amount
        uint256 withdraw_amount = __computeAmountToWithdraw(amount);
        // Delete investor
        _investors.removeByKey(investor_addr);
        // Transfer token
        fundToken.safeTransfer(investor_addr, withdraw_amount);

        emit InvestorAllFundsWithdrawn(investor_addr, withdraw_amount);
    }

    //=============================================================//
    //              PUBLIC FUNCTIONS (FUND MANAGER)                //
    //=============================================================//

    /**
     * Called by the owner to set a pending fund manager
     * @param newFundManager Fund manager address
     */
    function setPendingFundManager(address newFundManager) public onlyFundManager onlyInitialState {
        if ((newFundManager == address(0)) || (newFundManager == fundManager)) {
            revert FundManagerChangeError();
        }

        pendingFundManager = newFundManager;

        emit FundManagerPendingSet(newFundManager);
    }

    /**
     * Called by the pending fund manager to accept the role
     */
    function acceptFundManager() public onlyInitialState {
        if (_msgSender() != pendingFundManager) {
            revert FundManagerChangeError();
        }

        address old_fund_manager = fundManager;

        fundManager = pendingFundManager;
        remainingFundsAddr = pendingFundManager;
        pendingFundManager = address(0);

        emit FundManagerChanged(old_fund_manager, _msgSender());
    }

    /**
     * Called by the fund manager to deposit funds during investment
     * @param amount_ Amount to deposit
     */
    function fundManagerDeposit(
        uint256 amount_
    ) public onlyFundManager onlyDuringInvestment {
        if (amount_ == 0) {
            revert AmountError(amount_);
        }

        fundToken.safeTransferFrom(_msgSender(), address(this), amount_);

        emit FundManagerFundsDeposited(_msgSender(), amount_);
    }

    /**
     * Called by the fund manager to withdraw the specified amount of funds during investment
     * @param amount_ Amount to withdraw
     */
    function fundManagerWithdraw(
        uint256 amount_
    ) public onlyFundManager onlyDuringInvestment {
        if (amount_ == 0) {
            revert AmountError(amount_);
        }

        fundToken.safeTransfer(_msgSender(), amount_);

        emit FundManagerFundsWithdrawn(_msgSender(), amount_);
    }

    /**
     * Called by the fund manager to withdraw all funds during investment.
     */
    function fundManagerWithdrawAll() public onlyFundManager onlyDuringInvestment {
        fundManagerWithdraw(totalDepositedFunds());
    }

    /**
     * Called by the fund manager to return funds to a specific investor after investment
     * Useful for forcing the withdraw of funds to a specific investor
     * @param investor_ Investor address
     */
    function fundManagerReturnFundsToInvestor(
        address investor_
    ) public onlyFundManager onlyAfterInvestment {
        uint256 amount = _investors.getByKey(investor_);

        if (amount == 0) {
            revert AmountError(amount);
        }

        // Compute amount
        uint256 withdraw_amount = __computeAmountToWithdraw(amount);

        // Delete investor
        _investors.removeByKey(investor_);
        // Transfer token
        fundToken.safeTransfer(investor_, withdraw_amount);

        emit FundManagerFundsReturnedToInvestor(investor_, withdraw_amount);
    }

    /**
     * Called by the fund manager to return all funds to investors after investment
     * Useful for forcing the withdraw of funds to all investors
     * @dev It can be expensive in terms of gas, it's better to call it only if there are few investors remaining
     */
    function fundManagerReturnFundsToAllInvestors() public onlyFundManager onlyAfterInvestment {
        if (_investors.isEmpty()) {
            revert NoInvestorError();
        }

        // Withdraw to all investors
        for (uint256 i = 0; i < _investors.length(); i++) {
            // Get investor amount
            uint256 amount = _investors.getByIndex(i);

            if (amount != 0) {
                // Compute amount
                uint256 withdraw_amount = __computeAmountToWithdraw(amount);
                // Transfer token
                fundToken.safeTransfer(_investors.keyAtIndex(i), withdraw_amount);
            }
        }
        // Delete all investors
        _investors.removeAll();

        emit FundManagerFundsReturnedToAllInvestors();
    }

    /**
     * Called by the fund manager to set the address to withdraw remaining funds
     * @param remainingFundsAddr_ Address to withdraw remaining funds
     */
    function setRemainingFundsAddress(address remainingFundsAddr_) public onlyFundManager onlyInitialState {
        if (remainingFundsAddr_ == address(0)) {
            revert AddressError(remainingFundsAddr_);
        }

        address old_addr = remainingFundsAddr;
        remainingFundsAddr = remainingFundsAddr_;

        emit RemainingFundsAddressChanged(old_addr, remainingFundsAddr_);
    }

    /**
     * Called by the fund manager to set the fund token address
     * @param fundToken_ Fund token address
     */
    function setFundToken(
        address fundToken_
    ) public onlyFundManager onlyInitialState {
        if (fundToken_ == address(0)) {
            revert AddressError(fundToken_);
        }

        address old_token = address(fundToken);
        fundToken = IERC20(fundToken_);

        emit FundTokenChanged(old_token, fundToken_);
    }

    /**
     * Called by the fund manager to set the deposit multiple of
     * @param value_ Deposit multiple of
     */
    function setDepositMultipleOf(
        uint256 value_
    ) public onlyFundManager onlyInitialState {
        if (value_ == 0) {
            revert ValueError(value_);
        }

        uint256 old_value = depositMultipleOf;
        depositMultipleOf = value_;

        emit DepositMultipleOfChanged(old_value, value_);
    }

    /**
     * Called by the fund manager to set the minimum investor deposit
     * @param value_ Minimum investor deposit amount
     */
    function setMinInvestorDeposit(
        uint256 value_
    ) public onlyFundManager onlyInitialState {
        if ((value_ == 0) || (value_ >= maxInvestorDeposit) || ((value_ % depositMultipleOf) != 0)) {
            revert ValueError(value_);
        }

        uint256 old_value = minInvestorDeposit;
        minInvestorDeposit = value_;

        emit MinInvestorDepositChanged(old_value, value_);
    }

    /**
     * Called by the fund manager to set the maximum investor deposit
     * @param value_ Maximum investor deposit amount
     */
    function setMaxInvestorDeposit(
        uint256 value_
    ) public onlyFundManager onlyInitialState {
        if ((value_ == 0) || (value_ <= minInvestorDeposit) || ((value_ % depositMultipleOf) != 0)) {
            revert ValueError(value_);
        }

        uint256 old_value = maxInvestorDeposit;
        maxInvestorDeposit = value_;

        emit MaxInvestorDepositChanged(old_value, value_);
    }

    /**
     * Called by the fund manager to start investors deposit.
     */
    function startInvestorsDeposit() public onlyFundManager onlyInitialState {
        currState = InvestmentStates.BEFORE_INVESTMENT;

        emit InvestorsDepositStarted();
    }

    /**
     * Called by the fund manager to stop investors deposit
     */
    function stopInvestorsDeposit() public onlyFundManager onlyBeforeInvestment {
        // Update state
        currState = InvestmentStates.DURING_INVESTMENT;
        // Get initial amount before investment
        totalAmountBeforeInvestment = totalDepositedFunds();

        emit InvestorsDepositStopped();
    }

    /**
     * Called by the fund manager to start investors withdraw
     */
    function startInvestorsWithdraw() public onlyFundManager onlyDuringInvestment {
        // Update state
        currState = InvestmentStates.AFTER_INVESTMENT;
        // Get final amount after investment
        totalAmountAfterInvestment = totalDepositedFunds();
        // Compute multiplier
        investmentMultiplier = __computeMultiplier();

        emit InvestorsWithdrawStarted();
    }

    /**
     * Called by the fund manager to stop investors withdraw
     */
    function stopInvestorsWithdraw() public onlyFundManager onlyAfterInvestment {
        // Withdraw any remaining funds
        __withdrawRemainingFunds();
        // Delete all investors
        _investors.removeAll();
        // Reset state
        __resetState();

        emit InvestorsWithdrawStopped();
    }

    //=============================================================//
    //                      PRIVATE FUNCTIONS                      //
    //=============================================================//

     /**
        * Compute the investment multiplier
        * @return Investment multiplier
        */
    function __computeMultiplier() private view returns (uint256) {
        return ((totalAmountAfterInvestment * MULTIPLIER_DECIMALS) / totalAmountBeforeInvestment);
    }

    /**
     * Compute the amount to withdraw after investment.
     * @param  initialAmount_ Initial amount
     * @return Amount to withdraw after investment
     */
    function __computeAmountToWithdraw(
        uint256 initialAmount_
    ) private view returns (uint256) {
        return ((initialAmount_ * investmentMultiplier) / MULTIPLIER_DECIMALS);
    }

    /**
     * Withdraw remaining funds.
     */
    function __withdrawRemainingFunds() private {
        uint256 remaining_funds = totalDepositedFunds();

        if (remaining_funds != 0) {
            fundToken.safeTransfer(remainingFundsAddr, remaining_funds);
        }
    }

    /**
     * Reset state.
     */
    function __resetState() private {
        currState = InvestmentStates.INITIAL;
        totalAmountBeforeInvestment = 0;
        totalAmountAfterInvestment = 0;
        investmentMultiplier = MIN_MULTIPLIER;
    }
}
