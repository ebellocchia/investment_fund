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
// Tests for STATE_BEFORE_INVESTMENT state
//
contract('InvestmentFund.STATE_BEFORE_INVESTMENT', (accounts) => {
  // Initial steps
  beforeEach(async () => {
   await utils.initBeforeInvestmentState(this, accounts);
  });

  // Call investor deposit/withdraw with valid parameters
  it('should allow investors deposit and withdraw with valid parameters', async () => {
    let total_amount = 0;

    // Simulate a deposit from all users
    for (i = 1; i < (constants.TOTAL_TEST_INVESTORS + 1); i++) {
      // Simulate more than one deposit per user
      for (j = 0; j < 2; j++) {
        let curr_amount = 250 * i;
        let initial_balance = (await this.mock_token.balanceOf(accounts[i])).toNumber();
        total_amount += curr_amount;

        // Deposit from account
        let tx = await this.investment_fund.investorDeposit(curr_amount, { from: accounts[i] });
        // Check event
        truffleAssert.eventEmitted(tx, 'InvestorFundsDeposited', (ev) => { return ev.investor == accounts[i] && ev.amount == curr_amount; });
        // Check contract state
        assert.equal(await this.mock_token.balanceOf(accounts[i]), initial_balance - curr_amount, 'Invalid investor balanceOf after investor deposit #' + i);
        assert.equal(await this.investment_fund.numberOfInvestors(), i, 'Invalid numberOfInvestors after investor deposit #' + i);
        assert.equal(await this.investment_fund.totalDepositedFunds(), total_amount, 'Invalid totalDepositedFunds after investor deposit #' + i);
      }
    }

    // Simulate a withdraw to all users
    for (i = 1; i < (constants.TOTAL_TEST_INVESTORS + 1); i++) {
      let curr_amount = 500 * i;
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

  // Call stopInvestorsDeposit
  it('should go to STATE_DURING_INVESTMENT state when stopInvestorsDeposit is called', async () => {
    // Simulate some deposits
    await utils.initInvestorsDeposit(this, accounts);
    let total_deposit = (await this.investment_fund.totalDepositedFunds()).toNumber();

    // Go to next state
    let tx = await this.investment_fund.stopInvestorsDeposit();

    // Check event
    truffleAssert.eventEmitted(tx, 'InvestorsDepositStopped');
    // Check contract state
    assert.equal(await this.investment_fund.currState(), constants.STATE_DURING_INVESTMENT, 'Invalid currState after stopInvestorsDeposit is called');
    assert.equal(await this.investment_fund.totalAmountBeforeInvestment(), total_deposit, 'Invalid totalAmountBeforeInvestment after stopInvestorsDeposit is called');
    assert.equal(await this.investment_fund.totalAmountAfterInvestment(), 0, 'Invalid totalAmountAfterInvestment after stopInvestorsDeposit is called');
    // Check invalid caller
    await truffleAssert.reverts(this.investment_fund.stopInvestorsDeposit({ from: accounts[1] }), 'InvestmentFund: caller is not the fund manager');
  });

  // Call investor deposit/withdraw with invalid parameters
  it('should revert if investors deposit and withdraw are called with invalid parameters', async () => {
    let multiple_deposit_of = (await this.investment_fund.depositMultipleOf()).toNumber();
    let min_investment = (await this.investment_fund.minInvestorDeposit()).toNumber();
    let max_investment = (await this.investment_fund.maxInvestorDeposit()).toNumber();

    await truffleAssert.reverts(this.investment_fund.investorDeposit(0), 'InvestmentFund: amount shall not be zero');
    await truffleAssert.reverts(this.investment_fund.investorDeposit(min_investment - 1), 'InvestmentFund: amount shall be higher than minimum deposit');
    await truffleAssert.reverts(this.investment_fund.investorDeposit(max_investment + 1), 'InvestmentFund: amount shall be lower than maximum deposit');
    await truffleAssert.reverts(this.investment_fund.investorDeposit(min_investment + multiple_deposit_of / 2), 'InvestmentFund: amount shall be multiple of depositMultipleOf');
    await truffleAssert.reverts(this.investment_fund.investorWithdrawAll({ from: accounts[1] }), 'InvestmentFund: no funds to withdraw');
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
    await truffleAssert.reverts(this.investment_fund.fundManagerDeposit(constants.DUMMY_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerWithdraw(constants.DUMMY_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerWithdrawAll(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerReturnFundsToInvestor(accounts[1]), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerReturnFundsToAllInvestors(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.startInvestorsDeposit(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.startInvestorsWithdraw(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.stopInvestorsWithdraw(), 'InvestmentFund: operation not allowed in current state');
  });
});
