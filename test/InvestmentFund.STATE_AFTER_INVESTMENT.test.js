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
// Tests for STATE_AFTER_INVESTMENT state
//
contract('InvestmentFund.STATE_AFTER_INVESTMENT', (accounts) => {
  // Initial steps
  beforeEach(async () => {
   await utils.initAfterInvestmentState(this, accounts);
  });

  // Call investor withdraw with valid parameters
  it('should allow investors to withdraw their funds', async () => {
    let total_amount = (await this.investment_fund.totalDepositedFunds()).toNumber();
    let inv_multiplier = (await this.investment_fund.investmentMultiplier()).toNumber();

    for (i = 1; i < (constants.TOTAL_TEST_INVESTORS + 1); i++) {
      let curr_amount = Math.floor((500 * i * inv_multiplier) / constants.MULTIPLIER_DECIMALS);
      let initial_balance = (await this.mock_token.balanceOf(accounts[i])).toNumber();
      total_amount -= curr_amount;

      // Withdraw to account
      let tx = await this.investment_fund.investorWithdrawAll({ from: accounts[i] });

      // Check event
      truffleAssert.eventEmitted(tx, 'InvestorAllFundsWithdrawn', (ev) => { return ev.investor == accounts[i] && ev.amount == curr_amount; });
      // Check contract state
      assert.equal(await this.mock_token.balanceOf(accounts[i]), initial_balance + curr_amount, 'Invalid investor balanceOf after investor withdraw #' + i);
      assert.equal(await this.investment_fund.numberOfInvestors(), constants.TOTAL_TEST_INVESTORS - i, 'Invalid numberOfInvestors after investor withdraw #' + i);
      assert.equal(await this.investment_fund.totalDepositedFunds(), total_amount, 'Invalid totalDepositedFunds after investor withdraw #' + i);
    }
  });

  // Call fund manager withdraw (to single investor) with valid parameters
  it('should allow fund manager to return funds to investors singularly', async () => {
    let total_amount = (await this.investment_fund.totalDepositedFunds()).toNumber();
    let inv_multiplier = (await this.investment_fund.investmentMultiplier()).toNumber();

    for (i = 1; i < (constants.TOTAL_TEST_INVESTORS + 1); i++) {
      let curr_amount = Math.floor((500 * i * inv_multiplier) / constants.MULTIPLIER_DECIMALS);
      let initial_balance = (await this.mock_token.balanceOf(accounts[i])).toNumber();
      total_amount -= curr_amount;

      // Withdraw to investor
      let tx = await this.investment_fund.fundManagerReturnFundsToInvestor(accounts[i]);

      // Check event
      truffleAssert.eventEmitted(tx, 'FundManagerFundsReturnedToInvestor', (ev) => { return ev.investor == accounts[i] && ev.amount == curr_amount; });
      // Check contract state
      assert.equal(await this.mock_token.balanceOf(accounts[i]), initial_balance + curr_amount, 'Invalid investor balanceOf after fund manager withdraw to investor #' + i);
      assert.equal(await this.investment_fund.numberOfInvestors(), constants.TOTAL_TEST_INVESTORS - i, 'Invalid numberOfInvestors after fund manager withdraw to investor #' + i);
      assert.equal(await this.investment_fund.totalDepositedFunds(), total_amount, 'Invalid totalDepositedFunds after fund manager withdraw to investor #' + i);
    }
  });

  // Call fund manager withdraw (to all investors) with valid parameters
  it('should allow fund manager to return funds to all investors', async () => {
    // Store initial balances
    initial_balances = [];
    for (i = 1; i < (constants.TOTAL_TEST_INVESTORS + 1); i++) {
      initial_balances.push((await this.mock_token.balanceOf(accounts[i])).toNumber());
    }

    // Withdraw to all investor
    let tx = await this.investment_fund.fundManagerReturnFundsToAllInvestors();
    // Check event
    truffleAssert.eventEmitted(tx, 'FundManagerFundsReturnedToAllInvestors');
    // Check contract state
    assert.equal(await this.investment_fund.numberOfInvestors(), 0, 'Invalid numberOfInvestors after fund manager withdraw to all');

    // Verify all balances
    let inv_multiplier = (await this.investment_fund.investmentMultiplier()).toNumber();

    for (i = 1; i < (constants.TOTAL_TEST_INVESTORS + 1); i++) {
      let curr_amount = Math.floor((500 * i * inv_multiplier) / constants.MULTIPLIER_DECIMALS);
      assert.equal(await this.mock_token.balanceOf(accounts[i]), initial_balances[i - 1] + curr_amount, 'Invalid investor balanceOf after fund manager withdraw to all #' + i);
    }
  });

  // Call stopInvestorsWithdraw
  it('should go to STATE_INITIAL state when stopInvestorsWithdraw is called', async () => {
    let initial_balance = (await this.mock_token.balanceOf(this.fund_manager)).toNumber();
    let total_amount = (await this.investment_fund.totalDepositedFunds()).toNumber();

    // Go to next state
    let tx = await this.investment_fund.stopInvestorsWithdraw();
    // Check event
    truffleAssert.eventEmitted(tx, 'InvestorsWithdrawStopped');

    // Check contract state (the remaining funds are transferred to the fund manager)
    assert.equal(await this.investment_fund.currState(), constants.STATE_INITIAL, 'Invalid currState after stopInvestorsWithdraw is called');
    assert.equal(await this.investment_fund.totalDepositedFunds(), 0, 'Invalid totalDepositedFunds after stopInvestorsWithdraw is called');
    assert.equal(await this.mock_token.balanceOf(this.fund_manager), initial_balance + total_amount, 'Invalid fund manager balanceOf after stopInvestorsWithdraw is called');
  });

  // Call fund manager deposit/withdraw with invalid parameters
  it('should revert if fund manager deposit and withdraw are called with invalid parameters', async () => {
    // Withdraw all to reset funds
    await this.investment_fund.fundManagerReturnFundsToAllInvestors();

    await truffleAssert.reverts(this.investment_fund.fundManagerReturnFundsToInvestor(accounts[1]), 'InvestmentFund: no funds to withdraw');
    await truffleAssert.reverts(this.investment_fund.investorWithdrawAll(), 'InvestmentFund: no funds to withdraw');
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
    await truffleAssert.reverts(this.investment_fund.fundManagerDeposit(constants.DUMMY_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerWithdraw(constants.DUMMY_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.startInvestorsDeposit(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.stopInvestorsDeposit(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.startInvestorsWithdraw(), 'InvestmentFund: operation not allowed in current state');
  });
});
