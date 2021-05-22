//
// Requires
//
const truffleAssert = require('truffle-assertions');
const constants = require('./Constants.js');
const utils = require('./Utils.js');

//
// Tests
//

//
// Tests for STATE_DURING_INVESTMENT state
//
contract('InvestmentFund.STATE_DURING_INVESTMENT', (accounts) => {
  // Initial steps
  beforeEach(async () => {
   await utils.initDuringInvestmentState(this, accounts);
  });

  // Call fund manager deposit/withdraw with valid parameters
  it('should allow fund manager deposit and withdraw with valid parameters', async () => {
    let total_deposit = (await this.investment_fund.totalDepositedFunds()).toNumber();
    let initial_owner_bal = (await this.mock_token.balanceOf(this.fund_manager)).toNumber();

    let withdraw_amount = total_deposit / 2;
    let deposit_amount = total_deposit / 3;

    // Test withdraw
    let tx = await this.investment_fund.fundManagerWithdraw(withdraw_amount);
    truffleAssert.eventEmitted(tx, 'FundManagerFundsWithdrawn', (ev) => { return ev.owner == this.fund_manager && ev.amount == withdraw_amount; });
    assert.equal(await this.mock_token.balanceOf(this.fund_manager), initial_owner_bal + withdraw_amount, 'Invalid fund manager balanceOf after withdraw');
    assert.equal(await this.investment_fund.totalDepositedFunds(), total_deposit - withdraw_amount, 'Invalid totalDepositedFunds after fundManagerWithdraw is called');
    // Test deposit
    tx = await this.investment_fund.fundManagerDeposit(deposit_amount);
    truffleAssert.eventEmitted(tx, 'FundManagerFundsDeposited', (ev) => { return ev.owner == this.fund_manager && ev.amount == deposit_amount; });
    assert.equal(await this.mock_token.balanceOf(this.fund_manager), initial_owner_bal + withdraw_amount - deposit_amount, 'Invalid fund manager balanceOf after deposit');
    assert.equal(await this.investment_fund.totalDepositedFunds(), withdraw_amount + deposit_amount, 'Invalid totalDepositedFunds after fundManagerDeposit is called');
    // Test withdraw all
    tx = await this.investment_fund.fundManagerWithdrawAll();
    truffleAssert.eventEmitted(tx, 'FundManagerFundsWithdrawn', (ev) => { return ev.owner == this.fund_manager && ev.amount == total_deposit - withdraw_amount + deposit_amount; });
    assert.equal(await this.mock_token.balanceOf(this.fund_manager), initial_owner_bal + total_deposit, 'Invalid fund manager balanceOf after withdraw all');
    assert.equal(await this.investment_fund.totalDepositedFunds(), 0, 'Invalid totalDepositedFunds after fundManagerWithdrawAll is called');
  });

  // Call startInvestorsWithdraw
  it('should go to STATE_AFTER_INVESTMENT state when startInvestorsWithdraw is called', async () => {
    // Simulate some deposits
    await this.investment_fund.fundManagerDeposit(constants.DUMMY_AMOUNT);
    let amount_before_inv = (await this.investment_fund.totalAmountBeforeInvestment()).toNumber();
    let total_deposit = (await this.investment_fund.totalDepositedFunds()).toNumber();

    // Go to next state
    let tx = await this.investment_fund.startInvestorsWithdraw();

    // Check event
    truffleAssert.eventEmitted(tx, 'InvestorsWithdrawStarted');
    // Compute new values
    let amount_after_inv = (await this.investment_fund.totalAmountAfterInvestment()).toNumber();
    let inv_multiplier = Math.floor((amount_after_inv * constants.MULTIPLIER_DECIMALS) / amount_before_inv);

    // Check contract state
    assert.equal(await this.investment_fund.currState(), constants.STATE_AFTER_INVESTMENT, 'Invalid currState after startInvestorsWithdraw is called');
    assert.equal(await this.investment_fund.totalAmountAfterInvestment(), amount_after_inv, 'Invalid totalAmountAfterInvestment after startInvestorsWithdraw is called');
    assert.equal(await this.investment_fund.investmentMultiplier(), inv_multiplier, 'Invalid investmentMultiplier after startInvestorsWithdraw is called');
    // Check invalid caller
    await truffleAssert.reverts(this.investment_fund.startInvestorsWithdraw({ from: accounts[1] }), 'InvestmentFund: caller is not the fund manager');
  });

  // Call fund manager deposit/withdraw with invalid parameters
  it('should revert if fund manager deposit and withdraw are called with invalid parameters', async () => {
    await truffleAssert.reverts(this.investment_fund.fundManagerDeposit(0), 'InvestmentFund: amount shall not be zero');
    await truffleAssert.reverts(this.investment_fund.fundManagerWithdraw(0), 'InvestmentFund: amount shall not be zero');
  });

  // Call not allowed functions
  it('should revert if not allowed functions are called', async () => {
    await truffleAssert.reverts(this.investment_fund.setPendingFundManager(accounts[1]), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.acceptFundManager(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.setRemainingFundsAddress(accounts[1]), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.setFundToken(this.mock_token.address), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.setDepositMultipleOf(constants.NEW_MULTIPLE_OF), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.setMinInvestorDeposit(constants.NEW_MIN_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.setMaxInvestorDeposit(constants.NEW_MAX_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.investorDeposit(constants.DUMMY_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.investorWithdrawAll(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerReturnFundsToInvestor(accounts[1]), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerReturnFundsToAllInvestors(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.startInvestorsDeposit(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.stopInvestorsDeposit(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.stopInvestorsWithdraw(), 'InvestmentFund: operation not allowed in current state');
  });
});
