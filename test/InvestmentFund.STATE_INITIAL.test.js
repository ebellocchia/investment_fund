//
// Requires
//
const truffleAssert = require('truffle-assertions');
const constants = require('./Constants.js');
const utils = require('./Utils.js');
const mockToken = artifacts.require('MockToken');

//
// Tests
//

//
// Tests for STATE_INITIAL state
//
contract('InvestmentFund.STATE_INITIAL', (accounts) => {
  // Initial steps
  beforeEach(async () => {
    await utils.initContracts(this, accounts);
  });

  // Test construction
  it('should construct contract correctly', async () => {
    // Test initial variable values
    assert.equal(await this.investment_fund.fundToken(), this.mock_token.address, 'Invalid fundToken after construction');
    assert.equal(await this.investment_fund.fundManager(), this.fund_manager, 'Invalid fundManager after construction');
    assert.equal(await this.investment_fund.pendingFundManager(), 0, 'Invalid pendingFundManager after construction');
    assert.equal(await this.investment_fund.remainingFundsAddr(), this.fund_manager, 'Invalid remainingFundsAddr after construction');
    assert.equal(await this.investment_fund.depositMultipleOf(), 1, 'Invalid depositMultipleOf after construction');
    assert.equal(await this.investment_fund.minInvestorDeposit(), 1, 'Invalid minInvestorDeposit after construction');
    assert.equal(await this.investment_fund.maxInvestorDeposit(), constants.UNLIMITED_AMOUNT, 'Invalid maxInvestorDeposit after construction');
    assert.equal(await this.investment_fund.currState(), constants.STATE_INITIAL, 'Invalid currState after construction');
    assert.equal(await this.investment_fund.totalAmountBeforeInvestment(), 0, 'Invalid totalAmountBeforeInvestment after construction');
    assert.equal(await this.investment_fund.totalAmountAfterInvestment(), 0, 'Invalid ttotalAmountAfterInvestment after construction');
    assert.equal(await this.investment_fund.investmentMultiplier(), constants.MIN_MULTIPLIER, 'Invalid investmentMultiplier after construction');
    assert.equal(await this.investment_fund.numberOfInvestors(), 0, 'Invalid numberOfInvestors after construction');
    assert.equal(await this.investment_fund.totalDepositedFunds(), 0, 'Invalid totalDepositedFunds after construction');
  });

  // Call set functions with valid parameters
  it('should allow to call set functions with valid parameters', async () => {
    // setRemainingFundsAddress
    let tx = await this.investment_fund.setRemainingFundsAddress(accounts[1]);
    truffleAssert.eventEmitted(tx, 'RemainingFundsAddressChanged', (ev) => { return ev.oldAddress == this.fund_manager && ev.newAddress == accounts[1]; });
    assert.equal(await this.investment_fund.remainingFundsAddr(), accounts[1], 'setRemainingFundsAddress failed');

    // setFundToken
    let mock_token2 = await mockToken.new('MockToken2', 'MT2', '1000000', { from: this.fund_manager });
    tx = await this.investment_fund.setFundToken(mock_token2.address);
    truffleAssert.eventEmitted(tx, 'FundTokenChanged', (ev) => { return ev.oldToken == this.mock_token.address && ev.newToken == mock_token2.address; });
    assert.equal(await this.investment_fund.fundToken(), mock_token2.address, 'setFundToken failed');

    // setDepositMultipleOf
    tx = await this.investment_fund.setDepositMultipleOf(constants.NEW_MULTIPLE_OF);
    truffleAssert.eventEmitted(tx, 'DepositMultipleOfChanged', (ev) => { return ev.oldValue == 1 && ev.newValue == constants.NEW_MULTIPLE_OF; });
    assert.equal(await this.investment_fund.depositMultipleOf(), constants.NEW_MULTIPLE_OF, 'setDepositMultipleOf failed');

    // setMinInvestorDeposit
    tx = await this.investment_fund.setMinInvestorDeposit(constants.NEW_MIN_AMOUNT);
    truffleAssert.eventEmitted(tx, 'MinInvestorDepositChanged', (ev) => { return ev.oldAmount == 1 && ev.newAmount == constants.NEW_MIN_AMOUNT; });
    assert.equal(await this.investment_fund.minInvestorDeposit(), constants.NEW_MIN_AMOUNT, 'setMinInvestorDeposit failed');

    // setMaxInvestorDeposit
    tx = await this.investment_fund.setMaxInvestorDeposit(constants.NEW_MAX_AMOUNT);
    truffleAssert.eventEmitted(tx, 'MaxInvestorDepositChanged', (ev) => { return ev.oldAmount == constants.UNLIMITED_AMOUNT && ev.newAmount == constants.NEW_MAX_AMOUNT; });
    assert.equal(await this.investment_fund.maxInvestorDeposit(), constants.NEW_MAX_AMOUNT, 'setMaxInvestorDeposit failed');
  });

  // Call startInvestorsDeposit
  it('should go to STATE_BEFORE_INVESTMENT state when startInvestorsDeposit is called', async () => {
    let tx = await this.investment_fund.startInvestorsDeposit();
    truffleAssert.eventEmitted(tx, 'InvestorsDepositStarted');
    assert.equal(await this.investment_fund.currState(), constants.STATE_BEFORE_INVESTMENT, 'Invalid currState after startInvestorsDeposit is called');

    await truffleAssert.reverts(this.investment_fund.startInvestorsDeposit({ from: accounts[1] }), 'InvestmentFund: caller is not the fund manager');
  });

  // Call set functions with invalid parameters
  it('should revert if set functions are called with invalid parameters', async () => {
    // Set parameters
    await this.investment_fund.setMinInvestorDeposit(constants.NEW_MIN_AMOUNT);
    await this.investment_fund.setMaxInvestorDeposit(constants.NEW_MAX_AMOUNT);
    await this.investment_fund.setDepositMultipleOf(constants.NEW_MULTIPLE_OF);

    // Check reverts
    await truffleAssert.reverts(this.investment_fund.setDepositMultipleOf(0), 'InvestmentFund: value shall not be zero');
    await truffleAssert.reverts(this.investment_fund.setMinInvestorDeposit(0), 'InvestmentFund: minimum amount shall not be zero');
    await truffleAssert.reverts(this.investment_fund.setMinInvestorDeposit(constants.NEW_MAX_AMOUNT + 1), 'InvestmentFund: minimum amount shall be lower than the maximum one');
    await truffleAssert.reverts(this.investment_fund.setMinInvestorDeposit(constants.NEW_MIN_AMOUNT + (constants.NEW_MULTIPLE_OF / 2)), 'InvestmentFund: amount shall be multiple of depositMultipleOf');
    await truffleAssert.reverts(this.investment_fund.setMaxInvestorDeposit(0), 'InvestmentFund: maximum amount shall not be zero');
    await truffleAssert.reverts(this.investment_fund.setMaxInvestorDeposit(constants.NEW_MIN_AMOUNT - 1), 'InvestmentFund: maximum amount shall be higher than the minimum one');
    await truffleAssert.reverts(this.investment_fund.setMaxInvestorDeposit(constants.NEW_MAX_AMOUNT - (constants.NEW_MULTIPLE_OF / 2)), 'InvestmentFund: amount shall be multiple of depositMultipleOf');
  });

  // Call set functions with invalid account
  it('should revert if set functions are not called by the fund manager', async () => {
    await truffleAssert.reverts(this.investment_fund.setRemainingFundsAddress(accounts[1], { from: accounts[1] }), 'InvestmentFund: caller is not the fund manager');
    await truffleAssert.reverts(this.investment_fund.setFundToken(this.mock_token.address, { from: accounts[1] }), 'InvestmentFund: caller is not the fund manager');
    await truffleAssert.reverts(this.investment_fund.setDepositMultipleOf(1, { from: accounts[1] }), 'InvestmentFund: caller is not the fund manager');
    await truffleAssert.reverts(this.investment_fund.setMinInvestorDeposit(1, { from: accounts[1] }), 'InvestmentFund: caller is not the fund manager');
    await truffleAssert.reverts(this.investment_fund.setMaxInvestorDeposit(1, { from: accounts[1] }), 'InvestmentFund: caller is not the fund manager');
  });

  // Call not allowed functions
  it('should revert if not allowed functions are called', async () => {
    await truffleAssert.reverts(this.investment_fund.investorDeposit(constants.DUMMY_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.investorWithdrawAll(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerDeposit(constants.DUMMY_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerWithdraw(constants.DUMMY_AMOUNT), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerWithdrawAll(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerReturnFundsToInvestor(accounts[1]), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.fundManagerReturnFundsToAllInvestors(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.stopInvestorsDeposit(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.startInvestorsWithdraw(), 'InvestmentFund: operation not allowed in current state');
    await truffleAssert.reverts(this.investment_fund.stopInvestorsWithdraw(), 'InvestmentFund: operation not allowed in current state');
  });
});
